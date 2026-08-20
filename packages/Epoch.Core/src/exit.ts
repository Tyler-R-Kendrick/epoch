import { createHash } from "node:crypto";
import { evaluatePosture, type PosturePolicy, type TrustPosture } from "@epoch/protocol";
import { EpochRepository, Event, MemoryEpochTransport } from "./core";
import type { EventData } from "./domain";
import { blobsForEvents } from "./ha/compact";
import { canonicalJson, isRecord } from "./json";

export const EXIT_BUNDLE_SCHEMA = "epoch-exit/v1" as const;

export type ExitBindingRecord = {
  readonly $type: "org.epoch.identity.binding";
  readonly epochAuthorId: string;
  readonly nostrPubkey: string;
  readonly bindingNonce: string;
  readonly bindingVersion: number;
  readonly seqno: number;
  readonly revoked: boolean;
  readonly createdAt: string;
};

export type ExitManifest = {
  readonly sha256: string;
  readonly eventCount: number;
  readonly headId: string;
};

export type ExitBundle = {
  readonly schema: typeof EXIT_BUNDLE_SCHEMA;
  readonly events: readonly EventData[];
  readonly blobs: Readonly<Record<string, string>>;
  readonly bindings: readonly ExitBindingRecord[];
  readonly manifest: ExitManifest;
  readonly posture?: TrustPosture;
};

export class ExitBundleError extends Error {
  readonly code = "exit_bundle_invalid" as const;
  constructor(message: string) {
    super(message);
    this.name = "ExitBundleError";
  }
}

export function exportExitBundle(
  repo: EpochRepository,
  options: { readonly bindings?: readonly ExitBindingRecord[]; readonly posture?: TrustPosture } = {},
): ExitBundle {
  const events = repo.events().map((event) => event.toJSON());
  const blobs = blobsForEvents(repo, repo.events());
  const heads = [...repo.heads()].sort();
  const headId = heads[heads.length - 1] ?? "";
  const bindings = [...(options.bindings ?? [])];
  const payload = { events, blobs, bindings, headId };
  const digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  return {
    schema: EXIT_BUNDLE_SCHEMA,
    events,
    blobs,
    bindings,
    manifest: {
      sha256: digest,
      eventCount: events.length,
      headId,
    },
    posture: options.posture,
  };
}

export function importExitBundle<Value>(repo: EpochRepository, bundle: Value): void {
  const parsed = parseExitBundle(bundle);
  const verifyProblems = repo.verify();
  if (verifyProblems.length > 0 && repo.events().length > 0) {
    throw new ExitBundleError(`destination repository verify failed: ${verifyProblems[0]}`);
  }
  const transport = new MemoryEpochTransport({
    events: [...parsed.events],
    blobs: { ...parsed.blobs },
    heads: parsed.manifest.headId === "" ? [] : [parsed.manifest.headId],
  });
  repo.syncWithTransport(transport);
  const problems = repo.verify();
  if (problems.length > 0) {
    throw new ExitBundleError(`imported history failed verify: ${problems[0]}`);
  }
}

export function parseExitBundle<Value>(value: Value): ExitBundle {
  if (!isRecord(value)) {
    throw new ExitBundleError("exit bundle must be an object");
  }
  const row = value;
  if (row.schema !== EXIT_BUNDLE_SCHEMA) {
    throw new ExitBundleError("unsupported exit bundle schema");
  }
  if (!Array.isArray(row.events) || !Array.isArray(row.bindings) || !isRecord(row.manifest)) {
    throw new ExitBundleError("exit bundle missing events, bindings, or manifest");
  }
  const blobs = isRecord(row.blobs)
    ? Object.fromEntries(Object.entries(row.blobs).filter((entry): entry is [string, string] => isString(entry[1])))
    : {};
  const manifest = row.manifest;
  if (!isString(manifest.sha256) || !isNumber(manifest.eventCount) || !isString(manifest.headId)) {
    throw new ExitBundleError("exit bundle manifest is malformed");
  }
  if (manifest.eventCount !== row.events.length) {
    throw new ExitBundleError("exit bundle truncated: eventCount does not match events");
  }
  let events: EventData[];
  try {
    // SAFETY: Event.fromJSON validates each serialized event before it is retained.
    events = row.events.map((item) => Event.fromJSON(item as EventData).toJSON());
  } catch (error) {
    throw new ExitBundleError(`exit bundle event decode failed: ${error instanceof Error ? error.message : "invalid event"}`);
  }
  // SAFETY: Runtime checks or construction above establish ExitBindingRecord[].
  const bindings = row.bindings as ExitBindingRecord[];
  const payload = { events, blobs, bindings, headId: manifest.headId };
  const digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  if (digest !== manifest.sha256) {
    throw new ExitBundleError("exit bundle tamper: manifest sha256 mismatch");
  }
  const posture = row.posture;
  if (posture !== undefined && posture !== "hosted" && posture !== "private" && posture !== "open") {
    throw new ExitBundleError("exit bundle unknown posture");
  }
  return {
    schema: EXIT_BUNDLE_SCHEMA,
    events,
    blobs,
    bindings,
    manifest: {
      sha256: manifest.sha256,
      eventCount: manifest.eventCount,
      headId: manifest.headId,
    },
    posture,
  };
}

export function migrateCommunity(input: {
  readonly from: EpochRepository;
  readonly to: EpochRepository;
  readonly fromPosture: Parameters<typeof evaluatePosture>[0];
  readonly toPosture: Parameters<typeof evaluatePosture>[0];
  readonly bindings?: readonly ExitBindingRecord[];
}): ExitBundle {
  const fromPolicy = evaluatePosture(input.fromPosture);
  const toPolicy = evaluatePosture(input.toPosture);
  assertSupportedPostureTransition(fromPolicy, toPolicy);
  const bundle = exportExitBundle(input.from, { bindings: input.bindings, posture: toPolicy.posture });
  importExitBundle(input.to, bundle);
  return bundle;
}

export function assertSupportedPostureTransition(from: PosturePolicy, to: PosturePolicy): void {
  const ok =
    (from.posture === "hosted" && to.posture === "open")
    || (from.posture === "private" && to.posture === "open")
    || from.posture === to.posture;
  if (!ok) {
    throw new ExitBundleError(`unsupported posture transition ${from.posture}→${to.posture}`);
  }
  if (to.allowServiceDiscovery && to.posture === "open") {
    throw new ExitBundleError("crafted open downgrade cannot enable service discovery");
  }
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function isNumber<Value>(value: Value): value is Value & number {
  return typeof value === "number";
}
