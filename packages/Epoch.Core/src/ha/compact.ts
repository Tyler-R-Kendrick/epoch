import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { EpochRepository, Event, writeJson } from "../core";
import { EventData, JsonEncoding, JsonFileExtension, Schemas, TextToken } from "../domain";
import { canonicalJson, isRecord } from "../json";
import { sha256, signJson, verifyJsonSignature } from "./crypto";

const COMPACT_DIR = "compacts";
const COMPACT_MANIFEST = "manifest.json";
const COMPACT_FORMAT = "epoch-compact-v1";
const MILLISECONDS_PER_SECOND = 1000;
const SHA256_HEX_LENGTH = 64;

export interface Compact {
  id: string;
  lastIncludedEventId: string;
  stateHash: string;
  timestamp: number;
  signerPublicKey: string;
  signature: string;
  payload: string;
}

export interface CompactManifestEntry {
  id: string;
  lastIncludedEventId: string;
  stateHash: string;
  timestamp: number;
  path: string;
}

export interface CompactManifest {
  latestCompactId?: string;
  prunedBeforeEventId?: string;
  compacts: CompactManifestEntry[];
}

interface CompactPayload {
  format: typeof COMPACT_FORMAT;
  events: EventData[];
  heads: string[];
  blobs: Record<string, string>;
}

type UnsignedCompact = Omit<Compact, "id" | "signature">;

export function createCompact(repository: EpochRepository, targetEventId?: string): Compact {
  repository.identityDocument();
  const events = repository.events();
  if (events.length === 0) throw new Error("cannot create compact for an empty event log");
  const targetIndex = targetEventId === undefined ? events.length - 1 : events.findIndex((event) => event.id === targetEventId);
  if (targetIndex < 0) throw new Error(`unknown compact target event: ${targetEventId}`);

  const included = events.slice(0, targetIndex + 1);
  const payload = encodePayload({
    format: COMPACT_FORMAT,
    events: included.map((event) => event.toJSON()),
    heads: headsForEvents(included),
    blobs: blobsForEvents(repository, included),
  });
  const identity = repository.identityDocument();
  const unsigned: UnsignedCompact = {
    lastIncludedEventId: included[included.length - 1].id,
    stateHash: sha256(Buffer.from(payload, "base64")),
    timestamp: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
    signerPublicKey: identity.publicKey,
    payload,
  };
  const signature = signJson(unsigned, identity.privateKey);
  const compact: Compact = { id: sha256(canonicalJson(unsigned)), ...unsigned, signature };
  storeCompact(repository, compact);
  return compact;
}

export function pruneEventLogBeforeCompact(repository: EpochRepository, compactId: string): void {
  const compact = loadCompact(repository, compactId);
  verifyCompact(compact);
  const events = repository.events();
  const targetIndex = events.findIndex((event) => event.id === compact.lastIncludedEventId);
  if (targetIndex < 0) throw new Error(`compact target is not present in local event log: ${compact.lastIncludedEventId}`);
  for (const event of events.slice(0, targetIndex + 1)) {
    rmSync(join(repository.eventsDir, `${event.id}${JsonFileExtension}`), { force: true });
  }
  const manifest = readManifest(repository);
  writeManifest(repository, { ...manifest, prunedBeforeEventId: compact.lastIncludedEventId });
}

export function restoreFromCompact(repository: EpochRepository, compactId: string): void {
  const compact = loadCompact(repository, compactId);
  verifyCompact(compact);
  const tailEvents = eventsAfterCompact(repository, compact);
  const tailBlobs = blobsForEvents(repository, tailEvents);
  const heads = tailEvents.length === 0 ? undefined : repository.heads();
  restoreCompactData(repository, compact, true);
  for (const event of tailEvents) {
    writeJson(join(repository.eventsDir, `${event.id}${JsonFileExtension}`), event.toJSON());
  }
  for (const [hash, data] of Object.entries(tailBlobs)) {
    writeFileSync(join(repository.blobsDir, hash), Buffer.from(data, "base64"));
  }
  if (heads !== undefined) writeJson(repository.headsPath, heads);
}

export function restoreCompactData(repository: EpochRepository, compact: Compact, replaceExisting: boolean): void {
  verifyCompact(compact);
  repository.init();
  const payload = decodePayload(compact.payload);
  if (replaceExisting) {
    clearJsonFiles(repository.eventsDir);
    clearFiles(repository.blobsDir);
  }
  mkdirSync(repository.eventsDir, { recursive: true });
  mkdirSync(repository.blobsDir, { recursive: true });
  for (const event of payload.events) {
    writeJson(join(repository.eventsDir, `${event.id}${JsonFileExtension}`), event);
  }
  for (const [hash, data] of Object.entries(payload.blobs)) {
    writeFileSync(join(repository.blobsDir, hash), Buffer.from(data, "base64"));
  }
  writeJson(repository.headsPath, payload.heads);
  storeCompact(repository, compact);
}

export function loadCompact(repository: EpochRepository, compactId: string): Compact {
  // SAFETY: Runtime checks or construction above establish Compact.
  return JSON.parse(readFileSync(compactPath(repository, compactId), JsonEncoding)) as Compact;
}

export function latestCompact(repository: EpochRepository): Compact | undefined {
  const manifest = readManifest(repository);
  const latestId = manifest.latestCompactId;
  return latestId === undefined ? undefined : loadCompact(repository, latestId);
}

export function compactsDir(repository: EpochRepository): string {
  return join(repository.epochDir, COMPACT_DIR);
}

export function compactPath(repository: EpochRepository, compactId: string): string {
  return join(compactsDir(repository), `${compactId}${JsonFileExtension}`);
}

export function verifyCompact(compact: Compact): void {
  const unsigned = unsignedCompact(compact);
  if (sha256(canonicalJson(unsigned)) !== compact.id) throw new Error(`compact ${compact.id}: content hash mismatch`);
  if (sha256(Buffer.from(compact.payload, "base64")) !== compact.stateHash) throw new Error(`compact ${compact.id}: state hash mismatch`);
  if (!verifyJsonSignature(unsigned, compact.signature, compact.signerPublicKey)) throw new Error(`compact ${compact.id}: invalid signature`);
  decodePayload(compact.payload);
}

export function eventsAfterCompact(repository: EpochRepository, compact: Compact): Event[] {
  const events = repository.events();
  const index = events.findIndex((event) => event.id === compact.lastIncludedEventId);
  return index < 0 ? events : events.slice(index + 1);
}

export function headsForEvents(events: readonly Event[]): string[] {
  const parents = new Set(events.flatMap((event) => event.parents));
  return events.filter((event) => !parents.has(event.id)).map((event) => event.id).sort();
}

function storeCompact(repository: EpochRepository, compact: Compact): void {
  verifyCompact(compact);
  mkdirSync(compactsDir(repository), { recursive: true });
  writeFileSync(compactPath(repository, compact.id), `${canonicalJson(compact)}${TextToken.newline}`, JsonEncoding);
  const manifest = readManifest(repository);
  const path = basename(compactPath(repository, compact.id));
  const compacts = [
    ...manifest.compacts.filter((entry) => entry.id !== compact.id),
    { id: compact.id, lastIncludedEventId: compact.lastIncludedEventId, stateHash: compact.stateHash, timestamp: compact.timestamp, path },
  ].sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
  writeManifest(repository, { ...manifest, latestCompactId: compact.id, compacts });
}

function readManifest(repository: EpochRepository): CompactManifest {
  const path = join(compactsDir(repository), COMPACT_MANIFEST);
  try {
    // SAFETY: Runtime checks or construction above establish CompactManifest.
    return JSON.parse(readFileSync(path, JsonEncoding)) as CompactManifest;
  } catch {
    return { compacts: [] };
  }
}

function writeManifest(repository: EpochRepository, manifest: CompactManifest): void {
  mkdirSync(compactsDir(repository), { recursive: true });
  writeFileSync(join(compactsDir(repository), COMPACT_MANIFEST), `${canonicalJson(manifest)}${TextToken.newline}`, JsonEncoding);
}

function unsignedCompact(compact: Compact): UnsignedCompact {
  return {
    lastIncludedEventId: compact.lastIncludedEventId,
    stateHash: compact.stateHash,
    timestamp: compact.timestamp,
    signerPublicKey: compact.signerPublicKey,
    payload: compact.payload,
  };
}

function encodePayload(payload: CompactPayload): string {
  return Buffer.from(canonicalJson(payload), JsonEncoding).toString("base64");
}

function decodePayload(payload: string): CompactPayload {
  // SAFETY: Runtime checks or construction above establish CompactPayload.
  const parsed = JSON.parse(Buffer.from(payload, "base64").toString(JsonEncoding)) as CompactPayload;
  if (parsed.format !== COMPACT_FORMAT) throw new Error("unsupported compact payload format");
  for (const event of parsed.events) Schemas.unsignedEvent.parse(event);
  return {
    format: parsed.format,
    events: parsed.events.map((event) => Event.fromJSON(event).toJSON()),
    heads: Schemas.heads.parse(parsed.heads),
    blobs: parsed.blobs,
  };
}

export function blobsForEvents(repository: EpochRepository, events: readonly Event[]) {
  const hashes = new Set<string>();
  for (const event of events) {
    collectBlobHash(event.payload.blob_sha256, hashes);
    const patches = event.payload.patches;
    if (Array.isArray(patches)) {
      for (const patch of patches) {
        if (isRecord(patch)) collectBlobHash(patch.blob_sha256, hashes);
      }
    }
  }
  const blobs: Record<string, string> = {};
  for (const hash of [...hashes].sort()) {
    const path = join(repository.blobsDir, hash);
    if (existsAsFile(path)) blobs[hash] = readFileSync(path).toString("base64");
  }
  return blobs;
}

function collectBlobHash<Value>(value: Value, hashes: Set<string>): void {
  if (isString(value) && value.length === SHA256_HEX_LENGTH && /^[a-f0-9]+$/u.test(value)) hashes.add(value);
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function clearJsonFiles(path: string): void {
  mkdirSync(path, { recursive: true });
  for (const name of readdirSync(path)) {
    if (name.endsWith(JsonFileExtension)) rmSync(join(path, name), { force: true });
  }
}

function clearFiles(path: string): void {
  mkdirSync(path, { recursive: true });
  for (const name of readdirSync(path)) {
    const child = join(path, name);
    if (statSync(child).isFile()) rmSync(child, { force: true });
  }
}

function existsAsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
