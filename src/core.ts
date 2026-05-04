import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { CRDTEventLog, CRDTOperation } from "./crdt";
import { canonicalJson } from "./json";

export type EventPayload = Record<string, unknown>;

export interface EventData {
  id: string;
  type: string;
  author: string;
  lamport: number;
  parents: string[];
  payload: EventPayload;
  timestamp: number;
  authorPublicKey: string;
  signature: string;
}

interface UnsignedEvent {
  type: string;
  author: string;
  lamport: number;
  parents: string[];
  payload: EventPayload;
  timestamp: number;
  authorPublicKey: string;
}

export interface IdentityData {
  author: string;
  publicKey: string;
  privateKey: string;
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

export const GIT_AUTHOR_NAME = "epoch";
export const GIT_AUTHOR_EMAIL = "epoch@example.invalid";

const ENTITY_TYPES_BY_EXTENSION = new Map([
  [".css", "text/css"],
  [".csv", "text/csv"],
  [".htm", "text/html"],
  [".html", "text/html"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".jsx", "application/javascript"],
  [".markdown", "text/plain"],
  [".md", "text/plain"],
  [".toml", "text/plain"],
  [".ts", "application/typescript"],
  [".tsx", "application/typescript"],
  [".txt", "text/plain"],
  [".xml", "text/plain"],
  [".yaml", "text/plain"],
  [".yml", "text/plain"],
]);

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
    return new Event(data);
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
    this.epochDir = join(this.root, ".epoch");
    this.eventsDir = join(this.epochDir, "events");
    this.blobsDir = join(this.epochDir, "blobs");
    this.usersDir = join(this.epochDir, "users");
    this.headsPath = join(this.epochDir, "heads.json");
    this.identityPath = join(this.epochDir, "identity.json");
    this.hooks = [...(options.hooks ?? [])];
  }

  registerHook(hook: EpochHook): () => void {
    this.hooks.push(hook);
    return () => {
      const index = this.hooks.indexOf(hook);
      if (index !== -1) this.hooks.splice(index, 1);
    };
  }

  init(author = "local"): void {
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
    const identity = readJson<Partial<IdentityData> & { author: string }>(this.identityPath);
    if (identity.publicKey !== undefined && identity.privateKey !== undefined) return identity as IdentityData;
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
    if (existsAsFile(path)) return readJson<IdentityData>(path);

    const identity = createIdentity(author);
    try {
      writeFileSync(path, `${canonicalJson(identity)}\n`, { encoding: "utf8", flag: "wx" });
      return identity;
    } catch (error) {
      if (isFileExistsError(error)) return readJson<IdentityData>(path);
      throw error;
    }
  }

  heads(): string[] {
    this.requireInitialized();
    this.emitHook("repository.heads.before", {});
    const heads = readJson<string[]>(this.headsPath);
    this.emitHook("repository.heads.after", { heads });
    return heads;
  }

  append(type: string, payload: EventPayload, author = this.identity()): Event {
    this.requireInitialized();
    const appendPayload = { ...payload };
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

  appendCRDTOperation(operation: CRDTOperation, author = this.identity()): Event {
    this.emitHook("repository.crdt.operation.before", { operation, author });
    const payload = new CRDTEventLog().changeForOperation(this.events(), operation, sha256(author).slice(0, 32));
    const event = this.append("crdt", payload, author);
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

  recordFile(path: string, entityType = "application/octet-stream", author = this.identity()): Event {
    this.emitHook("repository.recordFile.before", { path, entityType, author });
    const { absolute, relativePath } = resolveInside(this.root, path, "record file", "repository root");
    const data = readFileSync(absolute);
    const blobSha256 = sha256(data);
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) {
      writeFileSync(blobPath, data);
    }
    const event = this.append("record", {
      path: relativePath.split(sep).join("/"),
      entity_type: entityType,
      blob_sha256: blobSha256,
      size: data.byteLength,
    }, author);
    this.emitHook("repository.recordFile.after", { path, entityType, author, event });
    return event;
  }

  read(eventId: string): Event {
    this.requireInitialized();
    this.emitHook("repository.read.before", { eventId });
    const event = Event.fromJSON(readJson<EventData>(join(this.eventsDir, `${eventId}.json`)));
    this.emitHook("repository.read.after", { eventId, event });
    return event;
  }

  events(): Event[] {
    this.requireInitialized();
    this.emitHook("repository.events.before", {});
    const events = readdirSync(this.eventsDir)
      .filter((name) => extname(name) === ".json")
      .map((name) => Event.fromJSON(readJson<EventData>(join(this.eventsDir, name))))
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
      if (event.type === "record") {
        problems.push(...this.verifyRecordedBlob(event));
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
    const result = { eventsCopied, blobsCopied };
    this.emitHook("repository.syncFrom.after", { peerRoot, result });
    return result;
  }

  gossip(peerRoot: string): SyncResult {
    this.emitHook("repository.gossip.before", { peerRoot });
    const inbound = this.syncFrom(peerRoot);
    const outbound = new EpochRepository(peerRoot).syncFrom(this.root);
    const result = {
      eventsCopied: inbound.eventsCopied + outbound.eventsCopied,
      blobsCopied: inbound.blobsCopied + outbound.blobsCopied,
    };
    this.emitHook("repository.gossip.after", { peerRoot, result });
    return result;
  }

  antiEntropy(peerRoot: string): SyncResult {
    this.emitHook("repository.antiEntropy.before", { peerRoot });
    const result = this.gossip(peerRoot);
    this.emitHook("repository.antiEntropy.after", { peerRoot, result });
    return result;
  }

  importFromGit(gitRoot: string): Event[] {
    this.requireInitialized();
    const sourceRoot = resolve(gitRoot);
    const tracked = execFileSync("git", ["-C", sourceRoot, "ls-files", "-z"]);
    return tracked
      .toString("utf8")
      .split("\0")
      .filter((path) => path.length > 0)
      .map((path) => {
        const data = readFileSync(resolveInside(sourceRoot, path, "read path", "Git repository").absolute);
        const target = resolveInside(this.root, path, "write path", "repository root").absolute;
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, data);
        return this.recordFile(path, entityTypeForPath(path));
      });
  }

  exportToGit(gitRoot: string): string[] {
    this.requireInitialized();
    const targetRoot = resolve(gitRoot);
    mkdirSync(targetRoot, { recursive: true });
    if (!existsAsDirectory(join(targetRoot, ".git"))) {
      execFileSync("git", ["-C", targetRoot, "-c", "init.defaultBranch=main", "init"]);
    }

    const exported: string[] = [];
    for (const event of this.latestRecords()) {
      const path = event.payload.path;
      const blobSha256 = event.payload.blob_sha256;
      if (typeof path !== "string" || typeof blobSha256 !== "string") continue;
      const target = resolveInside(targetRoot, path, "write path", "Git repository").absolute;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(this.blobsDir, blobSha256)));
      exported.push(path);
    }

    if (exported.length > 0) {
      execFileSync("git", ["-C", targetRoot, "add", ...exported]);
      const hasChanges = execFileSync("git", ["-C", targetRoot, "status", "--porcelain"]).toString("utf8").trim().length > 0;
      if (hasChanges) {
        commitGit(targetRoot, "Export from Epoch");
      }
    }
    return exported.sort();
  }

  private verifyRecordedBlob(event: Event): string[] {
    const blobSha256 = event.payload.blob_sha256;
    const size = event.payload.size;
    if (typeof blobSha256 !== "string" || typeof size !== "number") return [`${event.id}: invalid record payload`];
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) return [`${event.id}: missing blob ${blobSha256}`];
    const data = readFileSync(blobPath);
    const problems: string[] = [];
    if (sha256(data) !== blobSha256) problems.push(`${event.id}: blob hash mismatch`);
    if (data.byteLength !== size) problems.push(`${event.id}: blob size mismatch`);
    return problems;
  }

  private latestRecords(): Event[] {
    const records = new Map<string, Event>();
    for (const event of this.events()) {
      if (event.type === "record" && typeof event.payload.path === "string") {
        records.set(event.payload.path, event);
      }
    }
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

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${canonicalJson(value)}\n`, "utf8");
}

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function resolveInside(root: string, path: string, operation: string, description: string): { absolute: string; relativePath: string } {
  const absolute = resolve(isAbsolute(path) ? path : join(root, path));
  const relativePath = relative(root, absolute);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`cannot ${operation} outside ${description}: ${path}`);
  }
  return { absolute, relativePath };
}

export function commitGit(root: string, message: string): void {
  execFileSync("git", ["-C", root, "-c", `user.name=${GIT_AUTHOR_NAME}`, "-c", `user.email=${GIT_AUTHOR_EMAIL}`, "commit", "-m", message]);
}

function createIdentity(author: string): IdentityData {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    author,
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

function signEvent(event: Event, privateKey: string): string {
  return sign(null, Buffer.from(canonicalJson(event.unsigned())), privateKey).toString("base64");
}

function verifyEventSignature(event: Event): string | undefined {
  if (typeof event.signature !== "string" || event.signature.length === 0) return "missing signature";
  if (typeof event.authorPublicKey !== "string" || event.authorPublicKey.length === 0) return "missing public key";
  try {
    return verify(null, Buffer.from(canonicalJson(event.unsigned())), event.authorPublicKey, Buffer.from(event.signature, "base64"))
      ? undefined
      : "invalid signature";
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
  const deadline = Date.now() + 5000;
  while (true) {
    try {
      mkdirSync(lockDir);
      break;
    } catch (error) {
      if (!isFileExistsError(error) || Date.now() >= deadline) throw error;
      sleepSync(10);
    }
  }

  try {
    return work();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}

function sleepSync(milliseconds: number): void {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    // Synchronous repository APIs use a short bounded spin while waiting for another process's lock.
  }
}

function entityTypeForPath(path: string): string {
  return ENTITY_TYPES_BY_EXTENSION.get(extname(path).toLowerCase()) ?? "application/octet-stream";
}

function existsAsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "EEXIST";
}

function existsAsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
