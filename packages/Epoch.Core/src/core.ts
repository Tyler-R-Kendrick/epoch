import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { CRDTEventLog, CRDTOperation, EntityRegistry } from "./crdt";
import { canonicalJson } from "./json";
import {
  CryptoSpec,
  DefaultAuthor,
  EntityType,
  EventData,
  EventMetadata,
  EventDataSchema,
  EventPayload,
  EventType,
  FileExtension,
  Git,
  IdentityData,
  JsonEncoding,
  JsonFileExtension,
  LegacyIdentitySchema,
  FsFlag,
  IntentStatus,
  RepositoryText,
  Schemas,
  SignatureText,
  StorageName,
  TextToken,
} from "./domain";
import { z } from "zod";

export { GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME } from "./domain";
export type { EventData, EventMetadata, EventPayload, IdentityData } from "./domain";

interface UnsignedEvent {
  type: string;
  author: string;
  lamport: number;
  parents: string[];
  payload: EventPayload;
  timestamp: number;
  authorPublicKey: string;
}

export interface SyncResult {
  eventsCopied: number;
  blobsCopied: number;
}

export interface EpochSerializationProvider {
  readonly format: string;
  readonly extension: string;
  serialize(value: unknown): string;
  deserialize(text: string): unknown;
}

export const JsonSerializationProvider: EpochSerializationProvider = {
  format: "json",
  extension: JsonFileExtension,
  serialize: (value) => `${canonicalJson(value)}${TextToken.newline}`,
  deserialize: (text) => JSON.parse(text),
};

export function createToonSerializationProvider(): EpochSerializationProvider {
  return {
    format: "toon",
    extension: ".toon",
    serialize: (value) => `format=toon${TextToken.newline}${JSON.stringify(value)}${TextToken.newline}`,
    deserialize: (text) => JSON.parse(text.split(TextToken.newline).slice(1).join(TextToken.newline)),
  };
}

export interface MemoryEpochTransportSnapshot {
  readonly events: readonly EventData[];
  readonly blobs: Readonly<Record<string, string>>;
  readonly heads: readonly string[];
}

export interface EpochTransport {
  exportSnapshot(): MemoryEpochTransportSnapshot;
}

export class MemoryEpochTransport implements EpochTransport {
  constructor(readonly snapshot: MemoryEpochTransportSnapshot) {}

  exportSnapshot(): MemoryEpochTransportSnapshot {
    return this.snapshot;
  }
}

export class BundleEpochTransport {
  static write(path: string, transport: MemoryEpochTransport): void {
    const snapshot = transport.snapshot;
    const snapshotHash = sha256(canonicalJson(snapshot));
    writeFileSync(path, `${canonicalJson({ format: "epoch-bundle-v1", snapshotHash, snapshot })}${TextToken.newline}`, JsonEncoding);
  }

  static read(path: string): MemoryEpochTransport {
    const parsed = JSON.parse(readFileSync(path, JsonEncoding)) as { format?: unknown; snapshotHash?: unknown; snapshot?: unknown };
    if (parsed.format !== "epoch-bundle-v1" || typeof parsed.snapshotHash !== "string" || !isRecord(parsed.snapshot)) {
      throw new Error("invalid Epoch bundle transport");
    }
    if (sha256(canonicalJson(parsed.snapshot)) !== parsed.snapshotHash) throw new Error("Epoch bundle transport hash mismatch");
    const snapshot = parsed.snapshot as Partial<MemoryEpochTransportSnapshot>;
    return new MemoryEpochTransport({
      events: Array.isArray(snapshot.events) ? snapshot.events.map((event) => EventDataSchema.parse(event)) : [],
      blobs: isStringRecord(snapshot.blobs) ? snapshot.blobs : {},
      heads: Array.isArray(snapshot.heads) && snapshot.heads.every((head) => typeof head === "string") ? snapshot.heads : [],
    });
  }
}

export type InclusionRule =
  | { readonly type: "all" }
  | { readonly type: "intent-list"; readonly intentIds: readonly string[] }
  | { readonly type: "ancestor-chain"; readonly anchorIntentId: string }
  | { readonly type: "tag-filter"; readonly tag: string }
  | { readonly type: "union"; readonly rules: readonly InclusionRule[] }
  | { readonly type: "intersection"; readonly rules: readonly InclusionRule[] }
  | { readonly type: "difference"; readonly include: InclusionRule; readonly exclude: InclusionRule }
  | { readonly type: "until"; readonly rule: InclusionRule; readonly stopIntentId: string }
  | { readonly type: "base"; readonly viewName: string };

export interface ViewMetadata {
  readonly description?: string;
  readonly owner?: string;
  readonly visibility?: "private" | "shared";
}

export interface ViewDefinition {
  readonly type: "view-definition";
  readonly name: string;
  readonly rule: InclusionRule;
  readonly metadata?: ViewMetadata;
  readonly signature: string;
  readonly timestamp: number;
  readonly parentView?: string;
}

export interface GatePolicy {
  readonly requiredApprovals?: number;
  readonly requiredCiStatuses?: readonly string[];
}

export interface CollaborationProjection {
  readonly issues: readonly { readonly id: string; readonly title: string; readonly body: string; readonly author: string }[];
  readonly reviews: readonly { readonly id: string; readonly intentId: string; readonly state: string; readonly body: string; readonly author: string }[];
}

export interface GateStatus {
  readonly passed: boolean;
  readonly blockers: readonly string[];
}

export interface RedactionPlan {
  readonly blobSha256: string;
  readonly eventIds: readonly string[];
  readonly localBlobPresent: boolean;
  readonly alreadyRedacted: boolean;
}

export interface ViewState {
  readonly name: string;
  readonly intentIds: readonly string[];
  readonly records: Readonly<Record<string, {
    readonly eventId: string;
    readonly entityType: string;
    readonly blobSha256: string;
    readonly size: number;
  }>>;
  readonly crdt: Readonly<Record<string, unknown>>;
}

export interface ViewDiff {
  readonly from: string;
  readonly to: string;
  readonly onlyInFrom: readonly string[];
  readonly onlyInTo: readonly string[];
  readonly records: Readonly<Record<string, { readonly from?: unknown; readonly to?: unknown }>>;
  readonly crdt: Readonly<Record<string, { readonly from?: unknown; readonly to?: unknown }>>;
}

interface LocalViewIndex {
  readonly current?: string;
  readonly intentIds: Record<string, string[]>;
  readonly deleted: string[];
}

export type EpochHookName =
  | "repository.init.before"
  | "repository.init.after"
  | "repository.append.before"
  | "repository.append.after"
  | "repository.crdt.operation.before"
  | "repository.crdt.operation.after"
  | "repository.crdt.materialize.before"
  | "repository.crdt.materialize.after"
  | "repository.recordFile.before"
  | "repository.recordFile.after"
  | "repository.read.before"
  | "repository.read.after"
  | "repository.events.before"
  | "repository.events.after"
  | "repository.heads.before"
  | "repository.heads.after"
  | "repository.verify.before"
  | "repository.verify.after"
  | "repository.syncFrom.before"
  | "repository.syncFrom.after"
  | "repository.sync.before"
  | "repository.sync.after"
  | "repository.gossip.before"
  | "repository.gossip.after";

export interface EpochHookEvent {
  readonly name: EpochHookName;
  readonly repository: EpochRepository;
  readonly timestamp: number;
  readonly detail: Record<string, unknown>;
}

export type EpochHook = (event: EpochHookEvent) => void;

export interface EpochRepositoryOptions {
  readonly hooks?: readonly EpochHook[];
  readonly serializer?: EpochSerializationProvider;
}

export interface PolicyOptions {
  mergesRequired?: number;
  maintainers?: readonly string[];
}

export interface IntentDecision {
  intent: Event;
  merges: string[];
  rejections: string[];
  status: "merged" | "rejected" | "pending";
}

export interface PolicyProjection {
  intents: IntentDecision[];
  merged: string[];
  rejected: string[];
  pending: string[];
}

type RecordPatch = z.infer<typeof Schemas.recordPayload>;

const ENTITY_TYPES_BY_EXTENSION = new Map<string, string>([
  [FileExtension.css, EntityType.css],
  [FileExtension.csv, EntityType.csv],
  [FileExtension.htm, EntityType.html],
  [FileExtension.html, EntityType.html],
  [FileExtension.javascript, EntityType.javascript],
  [FileExtension.json, EntityType.json],
  [FileExtension.jsx, EntityType.jsx],
  [FileExtension.markdownLong, EntityType.markdown],
  [FileExtension.markdown, EntityType.markdown],
  [FileExtension.toml, EntityType.toml],
  [FileExtension.typescript, EntityType.typescript],
  [FileExtension.tsx, EntityType.tsx],
  [FileExtension.text, EntityType.plainText],
  [FileExtension.xml, EntityType.xml],
  [FileExtension.yaml, EntityType.yaml],
  [FileExtension.yml, EntityType.yaml],
]);

const LOCK_TIMEOUT_MS = 5000;
const LOCK_POLL_INTERVAL_MS = 10;
const ATOMICS_WAIT_BUFFER = new SharedArrayBuffer(4);
const ATOMICS_WAIT_ARRAY = new Int32Array(ATOMICS_WAIT_BUFFER);
const COMPACT_DIR = "compacts";
const COMPACT_MANIFEST = "manifest.json";

interface LocalCompactManifest {
  readonly prunedBeforeEventId?: string;
  readonly compacts?: readonly {
    readonly id?: string;
    readonly lastIncludedEventId?: string;
    readonly path?: string;
  }[];
}

const LocalCompactManifestSchema: z.ZodType<LocalCompactManifest> = z.object({
  prunedBeforeEventId: z.string().optional(),
  compacts: z.array(z.object({
    id: z.string().optional(),
    lastIncludedEventId: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
});
const LocalCompactSchema = z.object({ payload: z.string().optional() });

export class Event {
  readonly id: string;
  readonly type: string;
  readonly author: string;
  readonly lamport: number;
  readonly parents: string[];
  readonly payload: EventPayload;
  readonly timestamp: number;
  readonly authorPublicKey: string;
  readonly signature: string;

  constructor(data: Omit<EventData, "id"> & { id?: string }) {
    this.type = data.type;
    this.author = data.author;
    this.lamport = data.lamport;
    this.parents = [...data.parents];
    this.payload = { ...data.payload };
    this.timestamp = data.timestamp;
    this.authorPublicKey = data.authorPublicKey;
    this.signature = data.signature;
    this.id = data.id ?? this.computedId();
  }

  static create(type: string, author: string, authorPublicKey: string, lamport: number, parents: string[], payload: EventPayload): Event {
    return new Event({
      type,
      author,
      authorPublicKey,
      lamport,
      parents,
      payload,
      signature: "",
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  static fromJSON(data: EventData): Event {
    return new Event(EventDataSchema.parse(data));
  }

  unsigned(): UnsignedEvent {
    return {
      type: this.type,
      author: this.author,
      lamport: this.lamport,
      parents: [...this.parents],
      payload: this.payload,
      timestamp: this.timestamp,
      authorPublicKey: this.authorPublicKey,
    };
  }

  computedId(): string {
    return sha256(canonicalJson(this.unsigned()));
  }

  toJSON(): EventData {
    return {
      ...this.unsigned(),
      id: this.id,
      signature: this.signature,
    };
  }
}

export class EpochRepository {
  readonly root: string;
  readonly epochDir: string;
  readonly eventsDir: string;
  readonly blobsDir: string;
  readonly usersDir: string;
  readonly headsPath: string;
  readonly identityPath: string;
  readonly viewsPath: string;
  private readonly hooks: EpochHook[];
  private readonly serializer: EpochSerializationProvider;
  private compactPrefixCache?: { readonly manifestHash: string; readonly events: Map<string, Event> };

  constructor(root: string, options: EpochRepositoryOptions = {}) {
    this.root = resolve(root);
    this.epochDir = join(this.root, StorageName.epoch);
    this.eventsDir = join(this.epochDir, StorageName.events);
    this.blobsDir = join(this.epochDir, StorageName.blobs);
    this.usersDir = join(this.epochDir, StorageName.users);
    this.headsPath = join(this.epochDir, StorageName.heads);
    this.identityPath = join(this.epochDir, StorageName.identity);
    this.viewsPath = join(this.epochDir, StorageName.views);
    this.hooks = [...(options.hooks ?? [])];
    this.serializer = options.serializer ?? JsonSerializationProvider;
  }

  registerHook(hook: EpochHook): () => void {
    this.hooks.push(hook);
    return () => {
      const index = this.hooks.indexOf(hook);
      if (index !== -1) this.hooks.splice(index, 1);
    };
  }

  init(author = DefaultAuthor): void {
    this.emitHook("repository.init.before", { author });
    mkdirSync(this.eventsDir, { recursive: true });
    mkdirSync(this.blobsDir, { recursive: true });
    mkdirSync(this.usersDir, { recursive: true });
    if (!existsAsFile(this.headsPath)) {
      writeJson(this.headsPath, []);
    }
    if (!existsAsFile(this.identityPath)) {
      writeJson(this.identityPath, createIdentity(author));
    }
    if (!existsAsFile(this.viewsPath)) {
      writeJson(this.viewsPath, emptyLocalViewIndex());
    }
    this.emitHook("repository.init.after", { author });
  }

  identity(): string {
    return this.identityDocument().author;
  }

  identityDocument(): IdentityData {
    this.requireInitialized();
    const identity = readJson(this.identityPath, LegacyIdentitySchema);
    if (identity.publicKey !== undefined && identity.privateKey !== undefined) return Schemas.identity.parse(identity);
    const upgraded = createIdentity(identity.author);
    writeJson(this.identityPath, upgraded);
    return upgraded;
  }

  /**
   * Returns the signing identity for an event author, creating a per-author keypair when needed.
   * Author names are hashed into filesystem-safe filenames under `.epoch/users`.
   * Concurrent creators use atomic file creation so the first persisted identity wins.
   */
  identityFor(author: string): IdentityData {
    this.requireInitialized();
    const defaultIdentity = this.identityDocument();
    if (author === defaultIdentity.author) return defaultIdentity;

    mkdirSync(this.usersDir, { recursive: true });
    const path = join(this.usersDir, `${sha256(author)}.json`);
    if (existsAsFile(path)) return readJson(path, Schemas.identity);

    const identity = createIdentity(author);
    try {
      writeFileSync(path, `${canonicalJson(identity)}${TextToken.newline}`, { encoding: JsonEncoding, flag: FsFlag.exclusiveWrite });
      return identity;
    } catch (error) {
      if (isFileExistsError(error)) return readJson(path, Schemas.identity);
      throw error;
    }
  }

  heads(): string[] {
    this.requireInitialized();
    this.emitHook("repository.heads.before", {});
    const heads = readJson(this.headsPath, Schemas.heads);
    this.emitHook("repository.heads.after", { heads });
    return heads;
  }

  append(type: string, payload: EventPayload, author = this.identity()): Event {
    this.requireInitialized();
    const appendPayload = Schemas.eventPayload.parse(JSON.parse(canonicalJson(payload)));
    this.emitHook("repository.append.before", { type, payload: appendPayload, author });
    const identity = this.identityFor(author);
    const parentEventIds = this.parentsForNewEvent(type);
    const unsigned = Event.create(type, author, identity.publicKey, this.nextLamport(parentEventIds), parentEventIds, appendPayload);
    const event = new Event({
      ...unsigned.unsigned(),
      signature: signEvent(unsigned, identity.privateKey),
    });
    this.writeEvent(event);
    this.updateHeads((currentHeads) => {
      const headsBeingMerged = new Set(parentEventIds);
      const retainedHeads = currentHeads.filter((head) => !headsBeingMerged.has(head));
      return [...new Set([...retainedHeads, event.id])].sort();
    });
    this.trackLocalViewIntent(type, event.id);
    this.emitHook("repository.append.after", { event });
    return event;
  }

  createView(name: string, rule: InclusionRule, parentView?: string, metadata?: ViewMetadata, author = this.identity()): Event {
    this.assertValidViewName(name);
    const effectiveRule: InclusionRule = parentView === undefined ? rule : { type: "intersection", rules: [{ type: "base", viewName: parentView }, rule] };
    const payload = { name, rule: effectiveRule, metadata, parentView } satisfies EventPayload;
    this.undeleteLocalView(name);
    return this.append(EventType.viewDefinition, payload, author);
  }

  listViews(): ViewDefinition[] {
    const deleted = new Set(this.localViewIndex().deleted);
    return [...this.latestViewDefinitions().values()]
      .filter((view) => !deleted.has(view.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  currentView(): string {
    return this.localViewIndex().current ?? "main";
  }

  checkoutView(name: string): ViewState {
    const state = this.computeViewState(name);
    const trackedPaths = new Set<string>();
    for (const event of this.events()) {
      if (event.type === "record" && typeof event.payload.path === "string") trackedPaths.add(event.payload.path);
    }
    for (const path of trackedPaths) {
      if (state.records[path] !== undefined) continue;
      const target = resolveInside(this.root, path, "remove path", "repository root").absolute;
      if (existsAsFile(target)) unlinkSync(target);
    }
    for (const [path, record] of Object.entries(state.records)) {
      const target = resolveInside(this.root, path, "checkout path", "repository root").absolute;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(this.blobsDir, record.blobSha256)));
    }
    this.updateLocalViewIndex((index) => ({ ...index, current: name }));
    return state;
  }

  deleteView(name: string): void {
    if (name === "main") throw new Error("cannot delete view 'main': the main view is protected");
    this.updateLocalViewIndex((index) => ({
      ...index,
      current: index.current === name ? "main" : index.current,
      deleted: [...new Set([...index.deleted, name])].sort(),
    }));
  }

  computeViewState(name: string, gatePolicy: GatePolicy = {}): ViewState {
    const events = this.events();
    const intentIds = this.intentIdsForView(name, gatePolicy, events);
    const intents = sortEvents(events.filter((event) => intentIds.has(event.id)));
    const records: Record<string, { eventId: string; entityType: string; blobSha256: string; size: number }> = {};
    const crdtEntities = new Set<string>();
    for (const event of intents) {
      if (event.type === "record" && typeof event.payload.path === "string" && typeof event.payload.blob_sha256 === "string" && typeof event.payload.entity_type === "string" && typeof event.payload.size === "number") {
        records[event.payload.path] = {
          eventId: event.id,
          entityType: event.payload.entity_type,
          blobSha256: event.payload.blob_sha256,
          size: event.payload.size,
        };
      }
      if (event.type === "crdt" && typeof event.payload.entity === "string") crdtEntities.add(event.payload.entity);
    }
    const crdtLog = new CRDTEventLog();
    const crdt: Record<string, unknown> = {};
    for (const entity of [...crdtEntities].sort()) crdt[entity] = crdtLog.materialize(intents, entity);
    return { name, intentIds: intents.map((event) => event.id), records, crdt };
  }

  diffViews(from: string, to: string, gatePolicy: GatePolicy = {}): ViewDiff {
    const left = this.computeViewState(from, gatePolicy);
    const right = this.computeViewState(to, gatePolicy);
    const leftIds = new Set(left.intentIds);
    const rightIds = new Set(right.intentIds);
    const records: Record<string, { from?: unknown; to?: unknown }> = {};
    for (const path of [...new Set([...Object.keys(left.records), ...Object.keys(right.records)])].sort()) {
      if (canonicalJson(left.records[path] ?? null) !== canonicalJson(right.records[path] ?? null)) records[path] = { from: left.records[path], to: right.records[path] };
    }
    const crdt: Record<string, { from?: unknown; to?: unknown }> = {};
    for (const entity of [...new Set([...Object.keys(left.crdt), ...Object.keys(right.crdt)])].sort()) {
      if (canonicalJson(left.crdt[entity] ?? null) !== canonicalJson(right.crdt[entity] ?? null)) crdt[entity] = { from: left.crdt[entity], to: right.crdt[entity] };
    }
    return {
      from,
      to,
      onlyInFrom: left.intentIds.filter((id) => !rightIds.has(id)),
      onlyInTo: right.intentIds.filter((id) => !leftIds.has(id)),
      records,
      crdt,
    };
  }

  promoteToView(sourceView: string, targetView: string, author = this.identity(), gatePolicy: GatePolicy = {}): Event {
    const source = this.computeViewState(sourceView, gatePolicy);
    const target = this.computeViewState(targetView, gatePolicy);
    const targetIds = new Set(target.intentIds);
    const promoted = source.intentIds.filter((id) => !targetIds.has(id));
    const currentRule = this.viewRule(targetView);
    const rule: InclusionRule = { type: "union", rules: [currentRule, { type: "intent-list", intentIds: promoted }] };
    return this.createView(targetView, rule, undefined, { description: `promoted from ${sourceView}` }, author);
  }

  appendApproval(intentId: string, author = this.identity()): Event {
    return this.append(EventType.approval, { intent_id: intentId }, author);
  }

  appendRejection(intentId: string, author = this.identity()): Event {
    return this.append(EventType.rejection, { intent_id: intentId }, author);
  }

  createIssue(title: string, body: string, author = this.identity(), metadata: EventMetadata = {}): Event {
    return this.append(EventType.collaborationIssue, withMetadata({ title, body }, metadata), author);
  }

  reviewIntent(intentId: string, state: string, body: string, author = this.identity()): Event {
    this.read(intentId);
    return this.append(EventType.collaborationReview, { intent_id: intentId, state, body }, author);
  }

  recordCI(name: string, status: string, intentId: string, author = this.identity()): Event {
    this.read(intentId);
    return this.append(EventType.ci, { name, status, intent_id: intentId }, author);
  }

  collaboration(): CollaborationProjection {
    const issues: { readonly id: string; readonly title: string; readonly body: string; readonly author: string }[] = [];
    const reviews: { readonly id: string; readonly intentId: string; readonly state: string; readonly body: string; readonly author: string }[] = [];
    for (const event of this.events()) {
      if (event.type === EventType.collaborationIssue && typeof event.payload.title === "string" && typeof event.payload.body === "string") {
        issues.push({ id: event.id, title: event.payload.title, body: event.payload.body, author: event.author });
      }
      if (event.type === EventType.collaborationReview && typeof event.payload.intent_id === "string" && typeof event.payload.state === "string" && typeof event.payload.body === "string") {
        reviews.push({ id: event.id, intentId: event.payload.intent_id, state: event.payload.state, body: event.payload.body, author: event.author });
      }
    }
    return { issues, reviews };
  }

  gateStatus(intentId: string, policy: { readonly requiredReviewState?: string; readonly requiredCi?: readonly string[]; readonly requiredApprovals?: number } = {}): GateStatus {
    const events = this.events();
    const blockers: string[] = [];
    if (!events.some((event) => event.id === intentId)) blockers.push(`unknown intent ${intentId}`);
    if (events.some((event) => event.type === EventType.rejection && event.payload.intent_id === intentId)) blockers.push("intent rejected");
    if (policy.requiredReviewState !== undefined && !events.some((event) => event.type === EventType.collaborationReview && event.payload.intent_id === intentId && event.payload.state === policy.requiredReviewState)) {
      blockers.push(`missing review ${policy.requiredReviewState}`);
    }
    for (const ci of policy.requiredCi ?? []) {
      if (!events.some((event) => event.type === EventType.ci && event.payload.intent_id === intentId && event.payload.name === ci && event.payload.status === "passed")) {
        blockers.push(`missing CI ${ci}`);
      }
    }
    const approvals = new Set(events.filter((event) => event.type === EventType.approval && event.payload.intent_id === intentId).map((event) => event.author));
    if (approvals.size < (policy.requiredApprovals ?? 0)) blockers.push(`requires ${policy.requiredApprovals ?? 0} approvals`);
    return { passed: blockers.length === 0, blockers };
  }

  appendOperation(command: string, status: string, detail: Record<string, unknown> = {}, author = this.identity()): Event {
    return this.append(EventType.operation, { command, status, detail }, author);
  }

  operations(): readonly { readonly id: string; readonly command: string; readonly status: string; readonly detail: unknown; readonly author: string }[] {
    return this.events().flatMap((event) => {
      if (event.type !== EventType.operation || typeof event.payload.command !== "string" || typeof event.payload.status !== "string") return [];
      return [{ id: event.id, command: event.payload.command, status: event.payload.status, detail: event.payload.detail, author: event.author }];
    });
  }

  recordConflictResolution(input: { readonly path: string; readonly entityType: string; readonly base: unknown; readonly left: unknown; readonly right: unknown; readonly resolved: unknown }, author = this.identity()): Event {
    return this.append(EventType.conflictResolution, {
      path: input.path,
      entity_type: input.entityType,
      conflict_hash: conflictHash(input),
      resolved: input.resolved,
    }, author);
  }

  reusableConflictResolution(input: { readonly path: string; readonly entityType: string; readonly base: unknown; readonly left: unknown; readonly right: unknown }): unknown {
    const hash = conflictHash(input);
    return this.events()
      .filter((event) => event.type === EventType.conflictResolution && event.payload.path === input.path && event.payload.entity_type === input.entityType && event.payload.conflict_hash === hash)
      .at(-1)?.payload.resolved;
  }

  mergeEntity(path: string, entityType: string, base: unknown, left: unknown, right: unknown): unknown {
    const resolution = this.reusableConflictResolution({ path, entityType, base, left, right });
    return resolution ?? EntityRegistry.defaults().merge(entityType, base, left, right);
  }

  redactBlob(blobSha256: string, reason: string, author = this.identity()): Event {
    return this.append(EventType.redaction, { blob_sha256: blobSha256, reason }, author);
  }

  planRedaction(blobSha256: string): RedactionPlan {
    const eventIds = this.events().flatMap((event) => eventReferencesBlob(event, blobSha256) ? [event.id] : []);
    return {
      blobSha256,
      eventIds,
      localBlobPresent: existsAsFile(join(this.blobsDir, blobSha256)),
      alreadyRedacted: this.redactedBlobHashes().has(blobSha256),
    };
  }

  redactions(): readonly { readonly id: string; readonly blobSha256: string; readonly reason: string; readonly author: string }[] {
    return this.events().flatMap((event) => {
      if (event.type !== EventType.redaction || typeof event.payload.blob_sha256 !== "string" || typeof event.payload.reason !== "string") return [];
      return [{ id: event.id, blobSha256: event.payload.blob_sha256, reason: event.payload.reason, author: event.author }];
    });
  }

  recordFile(path: string, entityType: string = EntityType.octetStream, author = this.identity()): Event {
    this.emitHook("repository.recordFile.before", { path, entityType, author });
    const event = this.append(EventType.record, this.recordPatch(path, entityType), author);
    this.emitHook("repository.recordFile.after", { path, entityType, author, event });
    return event;
  }

  appendCRDTOperation(operation: CRDTOperation, author = this.identity()): Event {
    this.emitHook("repository.crdt.operation.before", { operation, author });
    const events = this.events();
    const replicaID = sha256(canonicalJson({ author, nextLamport: events.length + 1, operation })).slice(0, 32);
    const payload = new CRDTEventLog().changeForOperation(events, operation, replicaID);
    const event = this.append(EventType.crdt, payload, author);
    this.emitHook("repository.crdt.operation.after", { operation, author, event });
    return event;
  }

  materialize(entity: string): unknown {
    this.requireInitialized();
    this.emitHook("repository.crdt.materialize.before", { entity });
    const value = new CRDTEventLog().materialize(this.events(), entity);
    this.emitHook("repository.crdt.materialize.after", { entity, value });
    return value;
  }

  intentFile(path: string, entityType: string = EntityType.octetStream, author = this.identity(), metadata: EventMetadata = {}): Event {
    return this.intent([this.recordPatch(path, entityType)], author, metadata);
  }

  intent(patches: RecordPatch[], author = this.identity(), metadata: EventMetadata = {}): Event {
    return this.append(EventType.intent, withMetadata({ base: this.mainIntentIds(), patches }, metadata), author);
  }

  mergeIntent(intentId: string, author = this.identity(), metadata: EventMetadata = {}): Event {
    const intent = this.read(intentId);
    if (intent.type !== EventType.intent) throw new Error(`not an intent: ${intentId}`);
    return this.append(EventType.intentMerge, withMetadata({ intent: intentId }, metadata), author);
  }

  rejectIntent(intentId: string, reason = "", author = this.identity(), metadata: EventMetadata = {}): Event {
    const intent = this.read(intentId);
    if (intent.type !== EventType.intent) throw new Error(`not an intent: ${intentId}`);
    return this.append(EventType.intentReject, withMetadata({ intent: intentId, reason }, { ...metadata, reason: metadata.reason ?? reason }), author);
  }

  comment(body: string, intentId?: string, author = this.identity(), metadata: EventMetadata = {}): Event {
    if (intentId !== undefined) {
      const intent = this.read(intentId);
      if (intent.type !== EventType.intent) throw new Error(`not an intent: ${intentId}`);
    }
    return this.append(EventType.intentComment, withMetadata({ ...(intentId === undefined ? {} : { intent: intentId }), body }, metadata), author);
  }

  policy(options: PolicyOptions = {}): PolicyProjection {
    const mergesRequired = options.mergesRequired ?? 2;
    const maintainers = options.maintainers === undefined ? undefined : new Set(options.maintainers);
    const decisions = new Map<string, IntentDecision>();

    for (const event of this.events()) {
      if (event.type !== EventType.intent) continue;
      decisions.set(event.id, { intent: event, merges: [], rejections: [], status: IntentStatus.pending });
    }

    for (const event of this.events()) {
      if (maintainers !== undefined && !maintainers.has(event.author)) continue;
      if (event.type === EventType.intentMerge) {
        const parsed = Schemas.intentMergePayload.safeParse(event.payload);
        if (!parsed.success) continue;
        decisions.get(parsed.data.intent)?.merges.push(event.author);
      } else if (event.type === EventType.intentReject) {
        const parsed = Schemas.intentRejectPayload.safeParse(event.payload);
        if (!parsed.success) continue;
        decisions.get(parsed.data.intent)?.rejections.push(event.author);
      }
    }

    const intents = [...decisions.values()].map((decision) => {
      const merges = [...new Set(decision.merges)].sort();
      const rejections = [...new Set(decision.rejections)].sort();
      const status = rejections.length > 0 ? IntentStatus.rejected : merges.length >= mergesRequired ? IntentStatus.merged : IntentStatus.pending;
      return { intent: decision.intent, merges, rejections, status };
    });

    return {
      intents,
      merged: intents.filter((decision) => decision.status === IntentStatus.merged).map((decision) => decision.intent.id),
      rejected: intents.filter((decision) => decision.status === IntentStatus.rejected).map((decision) => decision.intent.id),
      pending: intents.filter((decision) => decision.status === IntentStatus.pending).map((decision) => decision.intent.id),
    };
  }

  mainIntentIds(options: PolicyOptions = {}): string[] {
    return this.policy(options).merged;
  }

  mergedIntents(options: PolicyOptions = {}): Event[] {
    const merged = new Set(this.mainIntentIds(options));
    return this.events().filter((event) => merged.has(event.id));
  }

  mainPatches(options: PolicyOptions = {}): RecordPatch[] {
    return this.mergedIntents(options).flatMap((intent) => Schemas.intentPayload.parse(intent.payload).patches);
  }

  private recordPatch(path: string, entityType: string): RecordPatch {
    const { absolute, relativePath } = resolveInside(this.root, path, RepositoryText.recordFile, RepositoryText.repositoryRoot);
    const data = readFileSync(absolute);
    const blobSha256 = sha256(data);
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) {
      writeFileSync(blobPath, data);
    }
    return {
      path: relativePath.split(sep).join(TextToken.pathSeparator),
      entity_type: entityType,
      blob_sha256: blobSha256,
      size: data.byteLength,
    };
  }

  read(eventId: string): Event {
    this.requireInitialized();
    this.emitHook("repository.read.before", { eventId });
    const path = this.eventPath(eventId);
    const event = path !== undefined
      ? Event.fromJSON(EventDataSchema.parse(this.readSerialized(path)))
      : this.compactPrefixEvent(eventId);
    if (event === undefined) throw new Error(`event not found: ${eventId}`);
    this.emitHook("repository.read.after", { eventId, event });
    return event;
  }

  events(): Event[] {
    this.requireInitialized();
    this.emitHook("repository.events.before", {});
    const events = readdirSync(this.eventsDir)
      .filter((name) => this.isEventFile(name))
      .map((name) => Event.fromJSON(EventDataSchema.parse(this.readSerialized(join(this.eventsDir, name)))))
      .sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
    this.emitHook("repository.events.after", { events });
    return events;
  }

  verify(): string[] {
    this.requireInitialized();
    this.emitHook("repository.verify.before", {});
    const events = this.events();
    const known = new Map<string, Event>();
    const trustedPrefix = this.compactPrefixEventMap();
    const problems: string[] = [];

    for (const event of events) {
      if (event.id !== event.computedId()) {
        problems.push(`${event.id}: content hash mismatch`);
      }
      const signatureProblem = verifyEventSignature(event);
      if (signatureProblem !== undefined) problems.push(`${event.id}: ${signatureProblem}`);
      known.set(event.id, event);
    }

    for (const event of events) {
      for (const parent of event.parents) {
        const parentEvent = known.get(parent) ?? trustedPrefix.get(parent);
        if (parentEvent === undefined) {
          problems.push(`${event.id}: missing parent ${parent}`);
        } else if (event.lamport <= parentEvent.lamport) {
          problems.push(`${event.id}: lamport clock not greater than parent ${parent}`);
        }
      }
    }

    for (const head of this.heads()) {
      if (!known.has(head) && !trustedPrefix.has(head)) {
        problems.push(`head references missing event ${head}`);
      }
    }

    const redacted = this.redactedBlobHashes(events);
    for (const event of events) {
      if (event.type === EventType.record) {
        problems.push(...this.verifyRecordedBlob(event, redacted));
      } else if (event.type === EventType.intent) {
        const parsed = Schemas.intentPayload.safeParse(event.payload);
        if (!parsed.success) {
          problems.push(`${event.id}: invalid intent payload`);
        } else {
          for (const patch of parsed.data.patches) problems.push(...this.verifyPatchBlob(event.id, patch, redacted));
        }
      }
    }

    this.emitHook("repository.verify.after", { problems });
    return problems;
  }

  syncFrom(peerRoot: string): SyncResult {
    this.requireInitialized();
    this.emitHook("repository.syncFrom.before", { peerRoot });
    const peer = new EpochRepository(peerRoot);
    peer.requireInitialized();

    const eventsCopied = copyMissingFiles(peer.eventsDir, this.eventsDir);
    const blobsCopied = copyMissingFiles(peer.blobsDir, this.blobsDir);
    const peerHeads = peer.heads();
    this.updateHeads((heads) => [...new Set([...heads, ...peerHeads])].sort());
    const result = Schemas.syncResult.parse({ eventsCopied, blobsCopied });
    this.emitHook("repository.syncFrom.after", { peerRoot, result });
    return result;
  }

  sync(peerRoot: string): SyncResult {
    this.emitHook("repository.sync.before", { peerRoot });
    const result = this.gossip(peerRoot);
    this.emitHook("repository.sync.after", { peerRoot, result });
    return result;
  }

  exportToMemoryTransport(): MemoryEpochTransport {
    const blobs: Record<string, string> = {};
    mkdirSync(this.blobsDir, { recursive: true });
    for (const name of readdirSync(this.blobsDir)) {
      const path = join(this.blobsDir, name);
      if (statSync(path).isFile()) blobs[name] = readFileSync(path).toString("base64");
    }
    return new MemoryEpochTransport({
      events: this.events().map((event) => event.toJSON()),
      blobs,
      heads: this.heads(),
    });
  }

  syncWithTransport(transport: EpochTransport): SyncResult {
    this.requireInitialized();
    const snapshot = transport.exportSnapshot();
    mkdirSync(this.eventsDir, { recursive: true });
    mkdirSync(this.blobsDir, { recursive: true });
    let eventsCopied = 0;
    let blobsCopied = 0;
    for (const data of snapshot.events) {
      const event = Event.fromJSON(data);
      if (this.eventPath(event.id) === undefined) {
        this.writeEvent(event);
        eventsCopied += 1;
      }
    }
    for (const [hash, data] of Object.entries(snapshot.blobs)) {
      const path = join(this.blobsDir, hash);
      if (!existsAsFile(path)) {
        writeFileSync(path, Buffer.from(data, "base64"));
        blobsCopied += 1;
      }
    }
    this.updateHeads((heads) => [...new Set([...heads, ...snapshot.heads])].sort());
    return { eventsCopied, blobsCopied };
  }

  gossip(peerRoot: string): SyncResult {
    this.emitHook("repository.gossip.before", { peerRoot });
    const inbound = this.syncFrom(peerRoot);
    const outbound = new EpochRepository(peerRoot).syncFrom(this.root);
    const result = Schemas.syncResult.parse({
      eventsCopied: inbound.eventsCopied + outbound.eventsCopied,
      blobsCopied: inbound.blobsCopied + outbound.blobsCopied,
    });
    this.emitHook("repository.gossip.after", { peerRoot, result });
    return result;
  }

  rollback(target: string, reason = ""): Event {
    return this.append(EventType.rollback, { target, reason, previousHeads: this.heads() });
  }

  importFromGit(gitRoot: string): Event[] {
    this.requireInitialized();
    const sourceRoot = resolve(gitRoot);
    const tracked = execFileSync(Git.binary, [Git.workTreeOption, sourceRoot, Git.lsFiles, Git.nulTerminated]);
    return tracked
      .toString(JsonEncoding)
      .split(TextToken.nul)
      .filter((path) => path.length > 0)
      .map((path) => {
        const data = readFileSync(resolveInside(sourceRoot, path, RepositoryText.readPath, RepositoryText.gitRepository).absolute);
        const target = resolveInside(this.root, path, RepositoryText.writePath, RepositoryText.repositoryRoot).absolute;
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, data);
        return this.recordFile(path, entityTypeForPath(path));
      });
  }

  exportToGit(gitRoot: string): string[] {
    this.requireInitialized();
    const targetRoot = resolve(gitRoot);
    mkdirSync(targetRoot, { recursive: true });
    if (!existsAsDirectory(join(targetRoot, Git.repository))) {
      execFileSync(Git.binary, [Git.workTreeOption, targetRoot, Git.config, Git.initDefaultBranch, Git.init]);
    }

    const exported: string[] = [];
    for (const patch of this.latestRecords()) {
      const path = patch.path;
      const blobSha256 = patch.blob_sha256;
      if (!isString(path) || !isString(blobSha256)) continue;
      const target = resolveInside(targetRoot, path, RepositoryText.writePath, RepositoryText.gitRepository).absolute;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(this.blobsDir, blobSha256)));
      exported.push(path);
    }

    if (exported.length > 0) {
      execFileSync(Git.binary, [Git.workTreeOption, targetRoot, Git.add, ...exported]);
      const hasChanges = execFileSync(Git.binary, [Git.workTreeOption, targetRoot, Git.status, Git.porcelain]).toString(JsonEncoding).trim().length > 0;
      if (hasChanges) {
        commitGit(targetRoot, Git.exportMessage);
      }
    }
    return exported.sort();
  }

  private verifyRecordedBlob(event: Event, redacted: ReadonlySet<string>): string[] {
    const parsed = Schemas.recordPayload.safeParse(event.payload);
    if (!parsed.success) return [`${event.id}: ${RepositoryText.invalidFileRecordPayload}`];
    return this.verifyPatchBlob(event.id, parsed.data, redacted);
  }

  private verifyPatchBlob(owner: string, patch: RecordPatch, redacted: ReadonlySet<string>): string[] {
    const { blob_sha256: blobSha256, size } = patch;
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) return redacted.has(blobSha256) ? [] : [`${owner}: missing blob ${blobSha256}`];
    const data = readFileSync(blobPath);
    const problems: string[] = [];
    if (sha256(data) !== blobSha256) problems.push(`${owner}: blob hash mismatch`);
    if (data.byteLength !== size) problems.push(`${owner}: blob size mismatch`);
    return problems;
  }

  private latestRecords(): RecordPatch[] {
    const records = new Map<string, RecordPatch>();
    for (const event of this.events()) {
      if (event.type === EventType.record) {
        const parsed = Schemas.recordPayload.safeParse(event.payload);
        if (parsed.success) records.set(parsed.data.path, parsed.data);
      }
    }
    for (const patch of this.mainPatches()) records.set(patch.path as string, patch);
    return [...records.values()];
  }

  private redactedBlobHashes(events: readonly Event[] = this.events()): Set<string> {
    return new Set(events.flatMap((event) => event.type === EventType.redaction && typeof event.payload.blob_sha256 === "string" ? [event.payload.blob_sha256] : []));
  }

  private intentIdsForView(name: string, gatePolicy: GatePolicy, events: readonly Event[]): Set<string> {
    const rule = this.viewRule(name);
    const local = new Set(this.localViewIndex().intentIds[name] ?? []);
    const intentIds = this.evaluateRule(rule, events, gatePolicy, new Set([name]));
    for (const id of local) intentIds.add(id);
    if (name === "main") {
      for (const id of [...intentIds]) {
        if (!this.passesGate(id, events, gatePolicy)) intentIds.delete(id);
      }
    }
    return intentIds;
  }

  private viewRule(name: string): InclusionRule {
    return this.latestViewDefinitions().get(name)?.rule ?? (name === "main" ? { type: "all" } : { type: "base", viewName: "main" });
  }

  private latestViewDefinitions(): Map<string, ViewDefinition> {
    const definitions = new Map<string, Event>();
    for (const event of this.events()) {
      if (event.type !== EventType.viewDefinition || typeof event.payload.name !== "string" || !isInclusionRule(event.payload.rule)) continue;
      const previous = definitions.get(event.payload.name);
      if (previous === undefined || compareEvents(event, previous) > 0) definitions.set(event.payload.name, event);
    }
    const views = new Map<string, ViewDefinition>();
    const mainDefinition = definitions.get("main");
    views.set("main", {
      type: "view-definition",
      name: "main",
      rule: mainDefinition !== undefined && isInclusionRule(mainDefinition.payload.rule) ? mainDefinition.payload.rule : { type: "all" },
      signature: mainDefinition?.signature ?? "",
      timestamp: mainDefinition?.timestamp ?? 0,
    });
    for (const event of definitions.values()) {
      const metadata = isViewMetadata(event.payload.metadata) ? event.payload.metadata : undefined;
      views.set(event.payload.name as string, {
        type: "view-definition",
        name: event.payload.name as string,
        rule: event.payload.rule as InclusionRule,
        metadata,
        signature: event.signature,
        timestamp: event.timestamp,
        parentView: typeof event.payload.parentView === "string" ? event.payload.parentView : undefined,
      });
    }
    return views;
  }

  private evaluateRule(rule: InclusionRule, events: readonly Event[], gatePolicy: GatePolicy, resolvingViews: Set<string>): Set<string> {
    switch (rule.type) {
      case "all":
        return new Set(events.filter((event) => isIntentEvent(event) && !this.isLocallyScopedIntent(event.id) && this.passesGate(event.id, events, gatePolicy)).map((event) => event.id));
      case "intent-list":
        return new Set(rule.intentIds.filter((id) => events.some((event) => event.id === id && isIntentEvent(event))));
      case "ancestor-chain":
        return this.ancestorChain(rule.anchorIntentId, events);
      case "tag-filter":
        return new Set(events.filter((event) => isIntentEvent(event) && eventHasTag(event, rule.tag)).map((event) => event.id));
      case "union":
        return unionSets(rule.rules.map((child) => this.evaluateRule(child, events, gatePolicy, new Set(resolvingViews))));
      case "intersection":
        return intersectSets(rule.rules.map((child) => this.evaluateRule(child, events, gatePolicy, new Set(resolvingViews))));
      case "difference": {
        const included = this.evaluateRule(rule.include, events, gatePolicy, new Set(resolvingViews));
        const excluded = this.evaluateRule(rule.exclude, events, gatePolicy, new Set(resolvingViews));
        return new Set([...included].filter((id) => !excluded.has(id)));
      }
      case "until": {
        const included = this.evaluateRule(rule.rule, events, gatePolicy, new Set(resolvingViews));
        const stop = events.find((event) => event.id === rule.stopIntentId);
        if (stop === undefined) return included;
        return new Set([...included].filter((id) => {
          const event = events.find((candidate) => candidate.id === id);
          return event !== undefined && compareEvents(event, stop) <= 0;
        }));
      }
      case "base": {
        if (resolvingViews.has(rule.viewName)) throw new Error(`cyclic base view: ${rule.viewName}`);
        resolvingViews.add(rule.viewName);
        const baseRule = this.viewRule(rule.viewName);
        const resolved = this.evaluateRule(baseRule, events, gatePolicy, resolvingViews);
        for (const id of this.localViewIndex().intentIds[rule.viewName] ?? []) resolved.add(id);
        return resolved;
      }
    }
  }

  private ancestorChain(anchorIntentId: string, events: readonly Event[]): Set<string> {
    const byId = new Map(events.map((event) => [event.id, event]));
    const ids = new Set<string>();
    const visit = (id: string): void => {
      const event = byId.get(id);
      if (event === undefined || !isIntentEvent(event) || ids.has(id)) return;
      ids.add(id);
      for (const parent of event.parents) visit(parent);
    };
    visit(anchorIntentId);
    return ids;
  }

  private passesGate(intentId: string, events: readonly Event[], gatePolicy: GatePolicy): boolean {
    if (events.some((event) => event.type === EventType.rejection && event.payload.intent_id === intentId)) return false;
    const approvals = new Set(events.filter((event) => event.type === EventType.approval && event.payload.intent_id === intentId).map((event) => event.author));
    if (approvals.size < (gatePolicy.requiredApprovals ?? 0)) return false;
    for (const status of gatePolicy.requiredCiStatuses ?? []) {
      if (!events.some((event) => event.type === EventType.ci && event.payload.intent_id === intentId && event.payload.status === status)) return false;
    }
    return true;
  }

  private parentsForNewEvent(type: string): string[] {
    if (!isIntentType(type)) return this.heads();
    const currentView = this.currentView();
    const tip = this.viewTipIntentId(currentView);
    return tip === undefined ? this.heads() : [tip];
  }

  private viewTipIntentId(name: string): string | undefined {
    const events = this.events();
    const intentIds = this.intentIdsForView(name, {}, events);
    return sortEvents(events.filter((event) => intentIds.has(event.id))).at(-1)?.id;
  }

  private trackLocalViewIntent(type: string, eventId: string): void {
    if (!isIntentType(type)) return;
    const currentView = this.currentView();
    if (currentView === "main") return;
    this.updateLocalViewIndex((index) => {
      const intentIds = { ...index.intentIds };
      intentIds[currentView] = [...new Set([...(intentIds[currentView] ?? []), eventId])].sort();
      return { ...index, intentIds };
    });
  }

  private isLocallyScopedIntent(eventId: string): boolean {
    return Object.values(this.localViewIndex().intentIds).some((ids) => ids.includes(eventId));
  }

  private localViewIndex(): LocalViewIndex {
    this.requireInitialized();
    if (!existsAsFile(this.viewsPath)) writeJson(this.viewsPath, emptyLocalViewIndex());
    const index = JSON.parse(readFileSync(this.viewsPath, JsonEncoding)) as Partial<LocalViewIndex>;
    return {
      current: typeof index.current === "string" ? index.current : undefined,
      intentIds: isStringArrayRecord(index.intentIds) ? index.intentIds : {},
      deleted: Array.isArray(index.deleted) && index.deleted.every((name) => typeof name === "string") ? index.deleted : [],
    };
  }

  private updateLocalViewIndex(update: (index: LocalViewIndex) => LocalViewIndex): void {
    writeJson(this.viewsPath, update(this.localViewIndex()));
  }

  private undeleteLocalView(name: string): void {
    this.updateLocalViewIndex((index) => ({ ...index, deleted: index.deleted.filter((deleted) => deleted !== name) }));
  }

  private assertValidViewName(name: string): void {
    if (name.trim() === "" || name.includes("\0")) throw new Error(`invalid view name '${name}': must not be empty or contain null characters`);
  }

  private nextLamport(heads: string[]): number {
    return Math.max(0, ...heads.map((head) => this.read(head).lamport)) + 1;
  }

  private updateHeads(update: (heads: string[]) => string[]): void {
    withDirectoryLock(`${this.headsPath}.lock`, () => {
      writeJson(this.headsPath, update(this.heads()));
    });
  }

  private writeEvent(event: Event): void {
    writeFileSync(join(this.eventsDir, `${event.id}${this.serializer.extension}`), this.serializer.serialize(event.toJSON()), JsonEncoding);
  }

  private eventPath(eventId: string): string | undefined {
    const preferred = join(this.eventsDir, `${eventId}${this.serializer.extension}`);
    if (existsAsFile(preferred)) return preferred;
    const json = join(this.eventsDir, `${eventId}${JsonFileExtension}`);
    if (existsAsFile(json)) return json;
    return undefined;
  }

  private isEventFile(name: string): boolean {
    return extname(name) === this.serializer.extension || extname(name) === JsonFileExtension;
  }

  private readSerialized(path: string): unknown {
    const text = readFileSync(path, JsonEncoding);
    return extname(path) === this.serializer.extension ? this.serializer.deserialize(text) : JsonSerializationProvider.deserialize(text);
  }

  /**
   * Emits repository hook events with Unix-second timestamps matching persisted Epoch event timestamps.
   */
  private emitHook(name: EpochHookName, detail: Record<string, unknown>): void {
    const event: EpochHookEvent = {
      name,
      repository: this,
      timestamp: Math.floor(Date.now() / 1000),
      detail,
    };
    for (const hook of this.hooks) hook(event);
  }

  private requireInitialized(): void {
    if (!existsAsDirectory(this.eventsDir) || !existsAsDirectory(this.blobsDir) || !existsAsFile(this.headsPath)) {
      throw new Error(`not an Epoch repository: ${this.root}`);
    }
  }

  private compactPrefixEvent(eventId: string): Event | undefined {
    return this.compactPrefixEventMap().get(eventId);
  }

  private compactPrefixEventMap(): Map<string, Event> {
    const manifestPath = join(this.epochDir, COMPACT_DIR, COMPACT_MANIFEST);
    if (!existsAsFile(manifestPath)) return new Map();
    const manifestData = readFileSync(manifestPath, JsonEncoding);
    const manifestHash = sha256(manifestData);
    if (this.compactPrefixCache?.manifestHash === manifestHash) return this.compactPrefixCache.events;
    const manifest = LocalCompactManifestSchema.parse(JSON.parse(manifestData));
    if (manifest.prunedBeforeEventId === undefined) return new Map();
    const entry = (manifest.compacts ?? []).find((compact) => compact.lastIncludedEventId === manifest.prunedBeforeEventId);
    if (entry?.id === undefined) return new Map();
    const compactPath = join(this.epochDir, COMPACT_DIR, entry.path ?? `${entry.id}${JsonFileExtension}`);
    if (!existsAsFile(compactPath)) return new Map();
    const compact = LocalCompactSchema.parse(JSON.parse(readFileSync(compactPath, JsonEncoding)));
    if (typeof compact.payload !== "string") return new Map();
    const payload = JSON.parse(Buffer.from(compact.payload, "base64").toString(JsonEncoding)) as { events?: unknown };
    if (!Array.isArray(payload.events)) return new Map();
    const events = new Map(payload.events.map((event) => {
      const parsed = Event.fromJSON(EventDataSchema.parse(event));
      return [parsed.id, parsed] as const;
    }));
    this.compactPrefixCache = { manifestHash, events };
    return events;
  }
}

export function readJson<T>(path: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(readFileSync(path, JsonEncoding)));
}

export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${canonicalJson(value)}${TextToken.newline}`, JsonEncoding);
}

function sha256(data: string | Buffer): string {
  return createHash(CryptoSpec.eventHash).update(data).digest(CryptoSpec.hashDigest);
}

function withMetadata(payload: EventPayload, metadata: EventMetadata): EventPayload {
  const clean = cleanMetadata(metadata);
  return clean === undefined ? payload : { ...payload, metadata: clean };
}

function cleanMetadata(metadata: EventMetadata): EventMetadata | undefined {
  const clean: EventMetadata = {};
  if (metadata.title !== undefined && metadata.title.length > 0) clean.title = metadata.title;
  if (metadata.description !== undefined && metadata.description.length > 0) clean.description = metadata.description;
  if (metadata.reason !== undefined && metadata.reason.length > 0) clean.reason = metadata.reason;
  if (metadata.labels !== undefined) {
    const labels = metadata.labels.filter((label) => label.length > 0);
    if (labels.length > 0) clean.labels = labels;
  }
  return Object.keys(clean).length === 0 ? undefined : clean;
}

function conflictHash(input: { readonly path: string; readonly entityType: string; readonly base: unknown; readonly left: unknown; readonly right: unknown }): string {
  return sha256(canonicalJson({
    path: input.path,
    entity_type: input.entityType,
    base: input.base,
    left: input.left,
    right: input.right,
  }));
}

function resolveInside(root: string, path: string, operation: string, description: string): { absolute: string; relativePath: string } {
  const absolute = resolve(isAbsolute(path) ? path : join(root, path));
  const relativePath = relative(root, absolute);
  if (relativePath === TextToken.empty || relativePath === TextToken.parentPath || relativePath.startsWith(`${TextToken.parentPath}${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`cannot ${operation} outside ${description}: ${path}`);
  }
  return { absolute, relativePath };
}

export function commitGit(root: string, message: string): void {
  execFileSync(Git.binary, [Git.workTreeOption, root, Git.config, Git.userName, Git.config, Git.userEmail, Git.commit, Git.message, message]);
}

function createIdentity(author: string): IdentityData {
  const { publicKey, privateKey } = generateKeyPairSync(CryptoSpec.signingAlgorithm);
  return {
    author,
    publicKey: publicKey.export({ type: CryptoSpec.publicKeyType, format: CryptoSpec.keyFormat }).toString(),
    privateKey: privateKey.export({ type: CryptoSpec.privateKeyType, format: CryptoSpec.keyFormat }).toString(),
  };
}

function signEvent(event: Event, privateKey: string): string {
  return sign(null, Buffer.from(canonicalJson(event.unsigned())), privateKey).toString(CryptoSpec.signatureEncoding);
}

function verifyEventSignature(event: Event): string | undefined {
  if (!isString(event.signature) || event.signature.length === 0) return SignatureText.missingSignature;
  if (!isString(event.authorPublicKey) || event.authorPublicKey.length === 0) return SignatureText.missingPublicKey;
  try {
    return verify(null, Buffer.from(canonicalJson(event.unsigned())), event.authorPublicKey, Buffer.from(event.signature, CryptoSpec.signatureEncoding))
      ? undefined
      : SignatureText.invalidSignature;
  } catch (error) {
    return `signature verification error (key mismatch or corrupted signature data): ${error instanceof Error ? error.message : String(error)}`;
  }
}

function copyMissingFiles(sourceDir: string, targetDir: string): number {
  mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(sourceDir)) {
    const source = join(sourceDir, name);
    const target = join(targetDir, name);
    if (statSync(source).isFile() && !existsAsFile(target)) {
      writeFileSync(target, readFileSync(source));
      copied += 1;
    }
  }
  return copied;
}

function withDirectoryLock<T>(lockDir: string, work: () => T): T {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      mkdirSync(lockDir);
      break;
    } catch (error) {
      if (!isFileExistsError(error) || Date.now() >= deadline) throw error;
      sleepSync(LOCK_POLL_INTERVAL_MS);
    }
  }

  try {
    return work();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(ATOMICS_WAIT_ARRAY, 0, 0, milliseconds);
}

function entityTypeForPath(path: string): string {
  return ENTITY_TYPES_BY_EXTENSION.get(extname(path).toLowerCase()) ?? EntityType.octetStream;
}

function emptyLocalViewIndex(): LocalViewIndex {
  return { intentIds: {}, deleted: [] };
}

function isIntentType(type: string): boolean {
  return type === EventType.record || type === EventType.crdt || type === EventType.intent;
}

function isIntentEvent(event: Event): boolean {
  return isIntentType(event.type);
}

function sortEvents(events: readonly Event[]): Event[] {
  return [...events].sort(compareEvents);
}

function compareEvents(left: Event, right: Event): number {
  return left.lamport - right.lamport || left.author.localeCompare(right.author) || left.id.localeCompare(right.id);
}

function eventHasTag(event: Event, tag: string): boolean {
  const tags = event.payload.tags;
  return tags === tag || (Array.isArray(tags) && tags.includes(tag));
}

function unionSets(sets: readonly Set<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => [...set]));
}

function intersectSets(sets: readonly Set<string>[]): Set<string> {
  if (sets.length === 0) return new Set();
  return new Set([...sets[0]].filter((id) => sets.every((set) => set.has(id))));
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every((entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string"));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function eventReferencesBlob(event: Event, blobSha256: string): boolean {
  if (event.payload.blob_sha256 === blobSha256) return true;
  const patches = event.payload.patches;
  return Array.isArray(patches) && patches.some((patch) => isRecord(patch) && patch.blob_sha256 === blobSha256);
}

function isViewMetadata(value: unknown): value is ViewMetadata {
  if (value === undefined) return false;
  if (!isRecord(value)) return false;
  return (value.description === undefined || typeof value.description === "string")
    && (value.owner === undefined || typeof value.owner === "string")
    && (value.visibility === undefined || value.visibility === "private" || value.visibility === "shared");
}

function isInclusionRule(value: unknown): value is InclusionRule {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "all":
      return true;
    case "intent-list":
      return Array.isArray(value.intentIds) && value.intentIds.every((id) => typeof id === "string");
    case "ancestor-chain":
      return typeof value.anchorIntentId === "string";
    case "tag-filter":
      return typeof value.tag === "string";
    case "union":
    case "intersection":
      return Array.isArray(value.rules) && value.rules.every(isInclusionRule);
    case "difference":
      return isInclusionRule(value.include) && isInclusionRule(value.exclude);
    case "until":
      return isInclusionRule(value.rule) && typeof value.stopIntentId === "string";
    case "base":
      return typeof value.viewName === "string";
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function existsAsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isFileExistsError(error: unknown): boolean {
  return isObject(error) && "code" in error && (error as { code: unknown }).code === FsFlag.exists;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function existsAsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
