import { createHash } from "node:crypto";
import type { JsonObject, JsonValue } from "./json";
import type { ObjectStore } from "./object-store";
import { applySyncV2Batch, type SyncV2Object } from "./sync-v2";

export const SYNC_V2_COMMANDS = Object.freeze([
  "capabilities", "list-frontiers", "fetch-events", "fetch-objects", "fetch-ranges",
  "fetch-bundle-descriptors", "push-transaction", "verify-receipt",
] as const);
export type SyncV2Command = typeof SYNC_V2_COMMANDS[number];

export interface SyncV2Handshake {
  readonly protocol: "epoch.sync/v2";
  readonly hashAlgorithms: readonly "sha256"[];
  readonly signatureAlgorithms: readonly string[];
  readonly serializations: readonly "canonical-json"[];
  readonly eventVersions: readonly number[];
  readonly storageKinds: readonly ("inline" | "chunk-manifest" | "external-pointer")[];
  readonly filters: readonly string[];
  readonly compressions: readonly ("identity" | "gzip" | "openzl")[];
  readonly bundleVersions: readonly number[];
  readonly rangeFetch: boolean;
  readonly resume: boolean;
  readonly authSchemes: readonly string[];
  readonly limits: { readonly maxFrameBytes: number; readonly maxObjects: number; readonly maxTransactionBytes: number };
  readonly extensions: Readonly<Record<string, string>>;
  readonly commands: readonly SyncV2Command[];
}

export function createSyncV2Handshake(overrides: Partial<SyncV2Handshake> = {}): SyncV2Handshake {
  const handshake: SyncV2Handshake = {
    protocol: "epoch.sync/v2",
    hashAlgorithms: ["sha256"],
    signatureAlgorithms: ["ed25519"],
    serializations: ["canonical-json"],
    eventVersions: [1],
    storageKinds: ["inline", "chunk-manifest"],
    filters: [],
    // Prefer OpenZL when both peers advertise it (ADR-0053); identity always available.
    compressions: ["openzl", "identity"],
    bundleVersions: [1],
    rangeFetch: true,
    resume: true,
    authSchemes: ["bearer"],
    limits: { maxFrameBytes: 1024 * 1024, maxObjects: 10_000, maxTransactionBytes: 256 * 1024 * 1024 },
    extensions: {},
    commands: SYNC_V2_COMMANDS,
    ...overrides,
  };
  return Object.freeze(handshake);
}

export interface SyncV2Negotiation {
  readonly protocol: "epoch.sync/v2";
  readonly hashAlgorithm: "sha256";
  readonly signatureAlgorithm: string;
  readonly serialization: "canonical-json";
  readonly eventVersion: number;
  readonly storageKinds: readonly string[];
  readonly compression: string;
  readonly commands: readonly SyncV2Command[];
  readonly limits: SyncV2Handshake["limits"];
}

function intersection<T>(left: readonly T[], right: readonly T[]): T[] {
  const allowed = new Set(right);
  return left.filter((value) => allowed.has(value));
}

export function negotiateSyncV2(local: SyncV2Handshake, remote: SyncV2Handshake): SyncV2Negotiation {
  if (local.protocol !== "epoch.sync/v2" || remote.protocol !== "epoch.sync/v2") throw new Error("Sync v2 protocol mismatch");
  const signature = intersection(local.signatureAlgorithms, remote.signatureAlgorithms)[0];
  const eventVersion = intersection(local.eventVersions, remote.eventVersions).sort((a, b) => b - a)[0];
  const compression = intersection(local.compressions, remote.compressions)[0];
  if (!signature || eventVersion === undefined || !compression) throw new Error("No safe sync-v2 capability intersection");
  return Object.freeze({
    protocol: "epoch.sync/v2", hashAlgorithm: "sha256", signatureAlgorithm: signature,
    serialization: "canonical-json", eventVersion,
    storageKinds: intersection(local.storageKinds, remote.storageKinds), compression,
    commands: intersection(local.commands, remote.commands),
    limits: {
      maxFrameBytes: Math.min(local.limits.maxFrameBytes, remote.limits.maxFrameBytes),
      maxObjects: Math.min(local.limits.maxObjects, remote.limits.maxObjects),
      maxTransactionBytes: Math.min(local.limits.maxTransactionBytes, remote.limits.maxTransactionBytes),
    },
  });
}

export interface SyncPushTransaction {
  readonly transactionId: string;
  readonly expectedFrontier: readonly string[];
  readonly objects: readonly SyncV2Object[];
}

export interface SyncReceipt {
  readonly protocol: "epoch.sync-receipt/v2";
  readonly transactionId: string;
  readonly outcome: "applied" | "replayed" | "conflict" | "rejected";
  readonly objectIds: readonly string[];
  readonly receiptId: string;
  readonly detail?: string;
}

export class SyncV2TransactionReceiver {
  readonly #receipts = new Map<string, SyncReceipt>();
  constructor(readonly store: ObjectStore, readonly limits = createSyncV2Handshake().limits) {}

  async push(transaction: SyncPushTransaction, currentFrontier: readonly string[]): Promise<SyncReceipt> {
    const previous = this.#receipts.get(transaction.transactionId);
    if (previous !== undefined) return { ...previous, outcome: "replayed" };
    if (JSON.stringify([...transaction.expectedFrontier].sort()) !== JSON.stringify([...currentFrontier].sort())) {
      return this.receipt(transaction, "conflict", [], "frontier changed");
    }
    try {
      const applied = await applySyncV2Batch(this.store, transaction.objects, {
        maxObjects: this.limits.maxObjects, maxBytes: this.limits.maxTransactionBytes,
      });
      return this.receipt(transaction, "applied", applied.applied);
    } catch (error) {
      return this.receipt(transaction, "rejected", [], error instanceof Error ? error.message : String(error));
    }
  }

  verifyReceipt(transactionId: string): SyncReceipt | undefined { return this.#receipts.get(transactionId); }

  private receipt(transaction: SyncPushTransaction, outcome: SyncReceipt["outcome"], objectIds: readonly string[], detail?: string): SyncReceipt {
    const body = JSON.stringify({ transactionId: transaction.transactionId, outcome, objectIds, detail });
    const receipt: SyncReceipt = Object.freeze({
      protocol: "epoch.sync-receipt/v2", transactionId: transaction.transactionId, outcome,
      objectIds, receiptId: createHash("sha256").update(body).digest("hex"), detail,
    });
    this.#receipts.set(transaction.transactionId, receipt);
    return receipt;
  }
}

export interface SyncV2Transport {
  request(command: SyncV2Command, payload: JsonValue, signal?: AbortSignal): Promise<JsonValue>;
}

export class InProcessSyncV2Transport implements SyncV2Transport {
  constructor(readonly handler: (command: SyncV2Command, payload: JsonValue) => Promise<JsonValue>) {}
  request(command: SyncV2Command, payload: JsonValue, signal?: AbortSignal): Promise<JsonValue> {
    if (signal?.aborted) return Promise.reject(signal.reason ?? new Error("Sync request aborted"));
    return this.handler(command, payload);
  }
}

export class HttpSyncV2Transport implements SyncV2Transport {
  constructor(readonly endpoint: URL, readonly fetchImpl: typeof fetch = fetch, readonly credential?: string) {
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "127.0.0.1" && endpoint.hostname !== "localhost") {
      throw new Error("Sync HTTP endpoint must use HTTPS outside loopback");
    }
  }
  async request(command: SyncV2Command, payload: JsonValue, signal?: AbortSignal): Promise<JsonValue> {
    const headers = new Headers({ "content-type": "application/json" });
    if (this.credential) headers.set("authorization", `Bearer ${this.credential}`);
    const response = await this.fetchImpl(new URL(command, this.endpoint), {
      method: "POST", headers,
      body: JSON.stringify(payload), signal,
    });
    if (!response.ok) throw new Error(`Sync HTTP ${response.status}`);
    const value: unknown = await response.json();
    if (!isJsonValue(value)) throw new Error("Sync HTTP response is not JSON");
    return value;
  }
}

function isJsonValue<Value>(value: Value): value is Value & JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isJsonObject(value) && Object.values(value).every(isJsonValue);
}

function isJsonObject<Value>(value: Value): value is Value & JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
