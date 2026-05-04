import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { canonicalJson } from "./json";
import {
  Branches,
  CryptoSpec,
  DefaultAuthor,
  EntityType,
  EventData,
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
  PrimitiveType,
  RepositoryText,
  Schemas,
  SignatureText,
  StorageName,
  TextToken,
} from "./domain";
import type { z } from "zod";

export { GIT_AUTHOR_EMAIL, GIT_AUTHOR_NAME } from "./domain";
export type { Branches, EventData, EventPayload, IdentityData } from "./domain";

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
  readonly branchesPath: string;

  constructor(root: string) {
    this.root = resolve(root);
    this.epochDir = join(this.root, StorageName.epoch);
    this.eventsDir = join(this.epochDir, StorageName.events);
    this.blobsDir = join(this.epochDir, StorageName.blobs);
    this.usersDir = join(this.epochDir, StorageName.users);
    this.headsPath = join(this.epochDir, StorageName.heads);
    this.identityPath = join(this.epochDir, StorageName.identity);
    this.branchesPath = join(this.epochDir, StorageName.branches);
  }

  init(author = DefaultAuthor): void {
    mkdirSync(this.eventsDir, { recursive: true });
    mkdirSync(this.blobsDir, { recursive: true });
    mkdirSync(this.usersDir, { recursive: true });
    if (!existsAsFile(this.headsPath)) {
      writeJson(this.headsPath, []);
    }
    if (!existsAsFile(this.identityPath)) {
      writeJson(this.identityPath, createIdentity(author));
    }
    if (!existsAsFile(this.branchesPath)) {
      writeJson(this.branchesPath, {});
    }
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
    return readJson(this.headsPath, Schemas.heads);
  }

  append(type: string, payload: EventPayload, author = this.identity()): Event {
    this.requireInitialized();
    const identity = this.identityFor(author);
    const heads = this.heads();
    const unsigned = Event.create(type, author, identity.publicKey, this.nextLamport(heads), heads, payload);
    const event = new Event({
      ...unsigned.unsigned(),
      signature: signEvent(unsigned, identity.privateKey),
    });
    writeJson(join(this.eventsDir, `${event.id}.json`), event.toJSON());
    writeJson(this.headsPath, [event.id]);
    return event;
  }

  recordFile(path: string, entityType: string = EntityType.octetStream, author = this.identity()): Event {
    const { absolute, relativePath } = resolveInside(this.root, path, RepositoryText.recordFile, RepositoryText.repositoryRoot);
    const data = readFileSync(absolute);
    const blobSha256 = sha256(data);
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) {
      writeFileSync(blobPath, data);
    }
    return this.append(EventType.record, {
      path: relativePath.split(sep).join(TextToken.pathSeparator),
      entity_type: entityType,
      blob_sha256: blobSha256,
      size: data.byteLength,
    }, author);
  }

  read(eventId: string): Event {
    this.requireInitialized();
    return Event.fromJSON(readJson(join(this.eventsDir, `${eventId}${JsonFileExtension}`), EventDataSchema));
  }

  events(): Event[] {
    this.requireInitialized();
    return readdirSync(this.eventsDir)
      .filter((name) => extname(name) === JsonFileExtension)
      .map((name) => Event.fromJSON(readJson(join(this.eventsDir, name), EventDataSchema)))
      .sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
  }

  verify(): string[] {
    this.requireInitialized();
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
      }
    }

    return problems;
  }

  syncFrom(peerRoot: string): SyncResult {
    this.requireInitialized();
    const peer = new EpochRepository(peerRoot);
    peer.requireInitialized();

    const eventsCopied = copyMissingFiles(peer.eventsDir, this.eventsDir);
    const blobsCopied = copyMissingFiles(peer.blobsDir, this.blobsDir);
    writeJson(this.headsPath, [...new Set([...this.heads(), ...peer.heads()])].sort());
    return Schemas.syncResult.parse({ eventsCopied, blobsCopied });
  }

  sync(peerRoot: string): SyncResult {
    const inbound = this.syncFrom(peerRoot);
    const outbound = new EpochRepository(peerRoot).syncFrom(this.root);
    return Schemas.syncResult.parse({
      eventsCopied: inbound.eventsCopied + outbound.eventsCopied,
      blobsCopied: inbound.blobsCopied + outbound.blobsCopied,
    });
  }

  branches(): Branches {
    this.requireInitialized();
    return readJson(this.branchesPath, Schemas.branches);
  }

  branch(name: string, targetHeads = this.heads()): Event {
    const branches = this.branches();
    branches[name] = [...targetHeads];
    writeJson(this.branchesPath, branches);
    return this.append(EventType.branch, { name, heads: targetHeads });
  }

  rollback(target: string, reason = ""): Event {
    return this.append(EventType.rollback, { target, reason, previousHeads: this.heads() });
  }

  rejectMerge(reason = ""): Event {
    return this.append(EventType.mergeRejected, { reason, rejectedHeads: this.heads() });
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
    for (const event of this.latestRecords()) {
      const path = event.payload.path;
      const blobSha256 = event.payload.blob_sha256;
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
    const { blob_sha256: blobSha256, size } = parsed.data;
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
      if (event.type === EventType.record && isString(event.payload.path)) {
        records.set(event.payload.path, event);
      }
    }
    return [...records.values()];
  }

  private nextLamport(heads: string[]): number {
    return Math.max(0, ...heads.map((head) => this.read(head).lamport)) + 1;
  }

  private requireInitialized(): void {
    if (!existsAsDirectory(this.eventsDir) || !existsAsDirectory(this.blobsDir) || !existsAsFile(this.headsPath)) {
      throw new Error(`not an Epoch repository: ${this.root}`);
    }
    if (!existsAsFile(this.branchesPath)) {
      writeJson(this.branchesPath, {});
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
  return typeof value === PrimitiveType.string;
}

function isObject(value: unknown): value is object {
  return typeof value === PrimitiveType.object && value !== null;
}

function existsAsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
