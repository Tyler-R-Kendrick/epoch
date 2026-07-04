import { createMemoryEpochVfs, type EpochVirtualFileSystem } from "@epoch/wasm-react";
import {
  createIntegritySigner,
  createIntegrityVerifier,
  type LiveSigner,
  type LiveVerifier,
} from "./signer";
import { hashHex, isRecord, normalizeJson, requireNonEmpty, stableJson } from "./util";

export type LiveEventKind = "op" | "rollback";

export interface LiveEvent {
  readonly id: string;
  readonly kind: LiveEventKind;
  readonly entity: string;
  readonly author: string;
  readonly lamport: number;
  readonly parents: readonly string[];
  readonly payload: Record<string, unknown>;
  readonly scheme: string;
  readonly signature: string;
}

export interface LiveLogOptions {
  readonly vfs?: EpochVirtualFileSystem;
  readonly signer?: LiveSigner;
  readonly verifier?: LiveVerifier;
  readonly author?: string;
  readonly root?: string;
}

export interface LiveLogIngestResult {
  readonly applied: number;
  readonly rejected: number;
}

/**
 * Append-only, content-addressed, signed event log — the browser-safe L0 layer.
 * Events are ordered by a deterministic total order (lamport, author, id) so any
 * two replicas that have seen the same events materialize identical state. Every
 * inbound event is verified before it is trusted.
 */
export class LiveLog {
  private readonly vfs: EpochVirtualFileSystem;
  private readonly signer: LiveSigner;
  private readonly verifier: LiveVerifier;
  private readonly root: string;
  private readonly listeners = new Set<() => void>();
  private events = new Map<string, LiveEvent>();
  private maxLamport = 0;

  constructor(options: LiveLogOptions = {}) {
    this.vfs = options.vfs ?? createMemoryEpochVfs();
    const author = requireNonEmpty(options.author ?? options.signer?.author ?? "browser", "author");
    this.signer = options.signer ?? createIntegritySigner(author);
    this.verifier = options.verifier ?? createIntegrityVerifier();
    this.root = normalizeRoot(options.root ?? "/.epoch-live");
    this.load();
  }

  get author(): string {
    return this.signer.author;
  }

  append(kind: LiveEventKind, entity: string, payload: Record<string, unknown>): LiveEvent {
    const cleanEntity = requireNonEmpty(entity, "entity");
    const lamport = this.maxLamport + 1;
    const parents = this.heads();
    const normalizedPayload = normalizeJson(payload);
    const canonical = canonicalUnsigned(kind, cleanEntity, this.signer.author, lamport, parents, normalizedPayload);
    const id = hashHex(canonical);
    const event: LiveEvent = {
      id,
      kind,
      entity: cleanEntity,
      author: this.signer.author,
      lamport,
      parents,
      payload: normalizedPayload,
      scheme: this.signer.scheme,
      signature: this.signer.sign(canonical),
    };
    this.store(event);
    this.notify();
    return event;
  }

  ingest(incoming: Iterable<LiveEvent>): LiveLogIngestResult {
    let applied = 0;
    let rejected = 0;
    for (const event of incoming) {
      if (this.events.has(event.id)) continue;
      if (!this.isValid(event)) {
        rejected += 1;
        continue;
      }
      this.store(event);
      applied += 1;
    }
    if (applied > 0) this.notify();
    return { applied, rejected };
  }

  /** All events in the deterministic total order used for materialization. */
  all(): readonly LiveEvent[] {
    return [...this.events.values()].sort(compareEvents);
  }

  forEntity(entity: string): readonly LiveEvent[] {
    return this.all().filter((event) => event.entity === entity);
  }

  entities(): readonly string[] {
    return [...new Set(this.all().map((event) => event.entity))].sort();
  }

  has(id: string): boolean {
    return this.events.has(id);
  }

  heads(): readonly string[] {
    const referenced = new Set<string>();
    for (const event of this.events.values()) {
      for (const parent of event.parents) referenced.add(parent);
    }
    return [...this.events.keys()].filter((id) => !referenced.has(id)).sort();
  }

  /** Returns the ids of events whose signature, hash, or lamport is invalid. */
  verify(): readonly string[] {
    const problems: string[] = [];
    for (const event of this.all()) {
      if (!this.isValid(event)) problems.push(event.id);
    }
    return problems;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private isValid(event: LiveEvent): boolean {
    if (!isValidShape(event)) return false;
    const canonical = canonicalUnsigned(
      event.kind,
      event.entity,
      event.author,
      event.lamport,
      [...event.parents].sort(),
      event.payload,
    );
    if (hashHex(canonical) !== event.id) return false;
    if (event.lamport < 1) return false;
    if (event.scheme !== this.verifier.scheme) return false;
    return this.verifier.verify(canonical, event.signature, event.author);
  }

  private store(event: LiveEvent): void {
    this.events.set(event.id, event);
    this.maxLamport = Math.max(this.maxLamport, event.lamport);
    this.vfs.writeFile(this.eventPath(event.id), JSON.stringify(event));
  }

  private load(): void {
    for (const path of this.vfs.listFiles(`${this.root}/events/`)) {
      const raw = this.vfs.readFile(path);
      if (raw === undefined) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (isValidShape(parsed)) {
        this.events.set(parsed.id, parsed);
        this.maxLamport = Math.max(this.maxLamport, parsed.lamport);
      }
    }
  }

  private eventPath(id: string): string {
    return `${this.root}/events/${id}.json`;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export function compareEvents(left: LiveEvent, right: LiveEvent): number {
  if (left.lamport !== right.lamport) return left.lamport - right.lamport;
  if (left.author !== right.author) return left.author < right.author ? -1 : 1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function canonicalUnsigned(
  kind: LiveEventKind,
  entity: string,
  author: string,
  lamport: number,
  parents: readonly string[],
  payload: Record<string, unknown>,
): string {
  return stableJson({ kind, entity, author, lamport, parents: [...parents].sort(), payload });
}

function isValidShape(value: unknown): value is LiveEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.kind === "op" || value.kind === "rollback") &&
    typeof value.entity === "string" &&
    typeof value.author === "string" &&
    typeof value.lamport === "number" &&
    Array.isArray(value.parents) &&
    value.parents.every((parent) => typeof parent === "string") &&
    isRecord(value.payload) &&
    typeof value.scheme === "string" &&
    typeof value.signature === "string"
  );
}

function normalizeRoot(root: string): string {
  const trimmed = root.replace(/\/+$/u, "");
  return trimmed.length === 0 ? "/.epoch-live" : trimmed;
}
