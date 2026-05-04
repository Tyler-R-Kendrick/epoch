import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { CRDTEventLog, CRDTOperation } from "./crdt";
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
import type { z } from "zod";

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
  | "repository.gossip.before"
  | "repository.gossip.after"
  | "repository.antiEntropy.before"
  | "repository.antiEntropy.after";

export interface EpochHookEvent {
  readonly name: EpochHookName;
  readonly repository: EpochRepository;
  readonly timestamp: number;
  readonly detail: Record<string, unknown>;
}

export type EpochHook = (event: EpochHookEvent) => void;

export interface EpochRepositoryOptions {
  readonly hooks?: readonly EpochHook[];
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
  private readonly hooks: EpochHook[];

  constructor(root: string, options: EpochRepositoryOptions = {}) {
    this.root = resolve(root);
    this.epochDir = join(this.root, StorageName.epoch);
    this.eventsDir = join(this.epochDir, StorageName.events);
    this.blobsDir = join(this.epochDir, StorageName.blobs);
    this.usersDir = join(this.epochDir, StorageName.users);
    this.headsPath = join(this.epochDir, StorageName.heads);
    this.identityPath = join(this.epochDir, StorageName.identity);
    this.hooks = [...(options.hooks ?? [])];
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
    const heads = this.heads();
    const unsigned = Event.create(type, author, identity.publicKey, this.nextLamport(heads), heads, appendPayload);
    const event = new Event({
      ...unsigned.unsigned(),
      signature: signEvent(unsigned, identity.privateKey),
    });
    writeJson(join(this.eventsDir, `${event.id}.json`), event.toJSON());
    this.updateHeads((currentHeads) => {
      const headsBeingMerged = new Set(heads);
      const retainedHeads = currentHeads.filter((head) => !headsBeingMerged.has(head));
      return [...new Set([...retainedHeads, event.id])].sort();
    });
    this.emitHook("repository.append.after", { event });
    return event;
  }

  recordFile(path: string, entityType: string = EntityType.octetStream, author = this.identity()): Event {
    this.emitHook("repository.recordFile.before", { path, entityType, author });
    const event = this.append(EventType.record, this.recordPatch(path, entityType), author);
    this.emitHook("repository.recordFile.after", { path, entityType, author, event });
    return event;
  }

  appendCRDTOperation(operation: CRDTOperation, author = this.identity()): Event {
    this.emitHook("repository.crdt.operation.before", { operation, author });
    const payload = new CRDTEventLog().changeForOperation(this.events(), operation, sha256(author).slice(0, 32));
    const event = this.append(EventType.crdt, payload, author);
    this.emitHook("repository.crdt.operation.after", { operation, author, event });
    return event;
  }

  crdtView(entity: string): unknown {
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
    const event = Event.fromJSON(readJson(join(this.eventsDir, `${eventId}${JsonFileExtension}`), EventDataSchema));
    this.emitHook("repository.read.after", { eventId, event });
    return event;
  }

  events(): Event[] {
    this.requireInitialized();
    this.emitHook("repository.events.before", {});
    const events = readdirSync(this.eventsDir)
      .filter((name) => extname(name) === JsonFileExtension)
      .map((name) => Event.fromJSON(readJson(join(this.eventsDir, name), EventDataSchema)))
      .sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
    this.emitHook("repository.events.after", { events });
    return events;
  }

  verify(): string[] {
    this.requireInitialized();
    this.emitHook("repository.verify.before", {});
    const events = this.events();
    const known = new Map<string, Event>();
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
        const parentEvent = known.get(parent);
        if (parentEvent === undefined) {
          problems.push(`${event.id}: missing parent ${parent}`);
        } else if (event.lamport <= parentEvent.lamport) {
          problems.push(`${event.id}: lamport clock not greater than parent ${parent}`);
        }
      }
    }

    for (const head of this.heads()) {
      if (!known.has(head)) {
        problems.push(`head references missing event ${head}`);
      }
    }

    for (const event of events) {
      if (event.type === EventType.record) {
        problems.push(...this.verifyRecordedBlob(event));
      } else if (event.type === EventType.intent) {
        const parsed = Schemas.intentPayload.safeParse(event.payload);
        if (!parsed.success) {
          problems.push(`${event.id}: invalid intent payload`);
        } else {
          for (const patch of parsed.data.patches) problems.push(...this.verifyPatchBlob(event.id, patch));
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
    return this.gossip(peerRoot);
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

  antiEntropy(peerRoot: string): SyncResult {
    this.emitHook("repository.antiEntropy.before", { peerRoot });
    const result = this.gossip(peerRoot);
    this.emitHook("repository.antiEntropy.after", { peerRoot, result });
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

  private verifyRecordedBlob(event: Event): string[] {
    const parsed = Schemas.recordPayload.safeParse(event.payload);
    if (!parsed.success) return [`${event.id}: ${RepositoryText.invalidFileRecordPayload}`];
    return this.verifyPatchBlob(event.id, parsed.data);
  }

  private verifyPatchBlob(owner: string, patch: RecordPatch): string[] {
    const { blob_sha256: blobSha256, size } = patch;
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) return [`${owner}: missing blob ${blobSha256}`];
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

  private nextLamport(heads: string[]): number {
    return Math.max(0, ...heads.map((head) => this.read(head).lamport)) + 1;
  }

  private updateHeads(update: (heads: string[]) => string[]): void {
    withDirectoryLock(`${this.headsPath}.lock`, () => {
      writeJson(this.headsPath, update(this.heads()));
    });
  }

  private emitHook(name: EpochHookName, detail: Record<string, unknown>): void {
    const event: EpochHookEvent = {
      name,
      repository: this,
      // Hook timestamps use Unix seconds to match persisted Epoch event timestamps.
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
