import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { EpochRepository, Event, readJson, writeJson } from "../core";
import { EventData, JsonEncoding, JsonFileExtension, Schemas, TextToken } from "../domain";
import { canonicalJson } from "../json";
import { sha256, signJson, verifyJsonSignature } from "./crypto";

const CHECKPOINT_DIR = "checkpoints";
const CHECKPOINT_MANIFEST = "manifest.json";
const CHECKPOINT_FORMAT = "epoch-checkpoint-v1";
const MILLISECONDS_PER_SECOND = 1000;
const SHA256_HEX_LENGTH = 64;

export interface Checkpoint {
  id: string;
  lastIncludedEventId: string;
  stateHash: string;
  timestamp: number;
  signerPublicKey: string;
  signature: string;
  payload: string;
}

export interface CheckpointManifestEntry {
  id: string;
  lastIncludedEventId: string;
  stateHash: string;
  timestamp: number;
  path: string;
}

export interface CheckpointManifest {
  latestCheckpointId?: string;
  prunedBeforeEventId?: string;
  checkpoints: CheckpointManifestEntry[];
}

interface CheckpointPayload {
  format: typeof CHECKPOINT_FORMAT;
  events: EventData[];
  heads: string[];
  blobs: Record<string, string>;
}

type UnsignedCheckpoint = Omit<Checkpoint, "id" | "signature">;

export function createCheckpoint(repository: EpochRepository, targetEventId?: string): Checkpoint {
  repository.identityDocument();
  const events = repository.events();
  if (events.length === 0) throw new Error("cannot create checkpoint for an empty event log");
  const targetIndex = targetEventId === undefined ? events.length - 1 : events.findIndex((event) => event.id === targetEventId);
  if (targetIndex < 0) throw new Error(`unknown checkpoint target event: ${targetEventId}`);

  const included = events.slice(0, targetIndex + 1);
  const payload = encodePayload({
    format: CHECKPOINT_FORMAT,
    events: included.map((event) => event.toJSON()),
    heads: repository.heads(),
    blobs: blobsForEvents(repository, included),
  });
  const identity = repository.identityDocument();
  const unsigned: UnsignedCheckpoint = {
    lastIncludedEventId: included[included.length - 1].id,
    stateHash: sha256(Buffer.from(payload, "base64")),
    timestamp: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
    signerPublicKey: identity.publicKey,
    payload,
  };
  const signature = signJson(unsigned, identity.privateKey);
  const checkpoint: Checkpoint = { id: sha256(canonicalJson(unsigned)), ...unsigned, signature };
  storeCheckpoint(repository, checkpoint);
  return checkpoint;
}

export function pruneEventLog(repository: EpochRepository, checkpointId: string): void {
  const checkpoint = loadCheckpoint(repository, checkpointId);
  verifyCheckpoint(checkpoint);
  const events = repository.events();
  const targetIndex = events.findIndex((event) => event.id === checkpoint.lastIncludedEventId);
  if (targetIndex < 0) throw new Error(`checkpoint target is not present in local event log: ${checkpoint.lastIncludedEventId}`);
  for (const event of events.slice(0, targetIndex + 1)) {
    rmSync(join(repository.eventsDir, `${event.id}${JsonFileExtension}`), { force: true });
  }
  const manifest = readManifest(repository);
  writeManifest(repository, { ...manifest, prunedBeforeEventId: checkpoint.lastIncludedEventId });
}

export function restoreFromCheckpoint(repository: EpochRepository, checkpointId: string): void {
  const checkpoint = loadCheckpoint(repository, checkpointId);
  verifyCheckpoint(checkpoint);
  const tailEvents = eventsAfterCheckpoint(repository, checkpoint);
  const tailBlobs = blobsForEvents(repository, tailEvents);
  const heads = tailEvents.length === 0 ? undefined : repository.heads();
  restoreCheckpointData(repository, checkpoint, true);
  for (const event of tailEvents) {
    writeJson(join(repository.eventsDir, `${event.id}${JsonFileExtension}`), event.toJSON());
  }
  for (const [hash, data] of Object.entries(tailBlobs)) {
    writeFileSync(join(repository.blobsDir, hash), Buffer.from(data, "base64"));
  }
  if (heads !== undefined) writeJson(repository.headsPath, heads);
}

export function restoreCheckpointData(repository: EpochRepository, checkpoint: Checkpoint, replaceExisting: boolean): void {
  verifyCheckpoint(checkpoint);
  repository.init();
  const payload = decodePayload(checkpoint.payload);
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
  storeCheckpoint(repository, checkpoint);
}

export function loadCheckpoint(repository: EpochRepository, checkpointId: string): Checkpoint {
  return JSON.parse(readFileSync(checkpointPath(repository, checkpointId), JsonEncoding)) as Checkpoint;
}

export function latestCheckpoint(repository: EpochRepository): Checkpoint | undefined {
  const manifest = readManifest(repository);
  const latestId = manifest.latestCheckpointId;
  return latestId === undefined ? undefined : loadCheckpoint(repository, latestId);
}

export function checkpointsDir(repository: EpochRepository): string {
  return join(repository.epochDir, CHECKPOINT_DIR);
}

export function checkpointPath(repository: EpochRepository, checkpointId: string): string {
  return join(checkpointsDir(repository), `${checkpointId}${JsonFileExtension}`);
}

export function verifyCheckpoint(checkpoint: Checkpoint): void {
  const unsigned = unsignedCheckpoint(checkpoint);
  if (sha256(canonicalJson(unsigned)) !== checkpoint.id) throw new Error(`checkpoint ${checkpoint.id}: content hash mismatch`);
  if (sha256(Buffer.from(checkpoint.payload, "base64")) !== checkpoint.stateHash) throw new Error(`checkpoint ${checkpoint.id}: state hash mismatch`);
  if (!verifyJsonSignature(unsigned, checkpoint.signature, checkpoint.signerPublicKey)) throw new Error(`checkpoint ${checkpoint.id}: invalid signature`);
  decodePayload(checkpoint.payload);
}

export function eventsAfterCheckpoint(repository: EpochRepository, checkpoint: Checkpoint): Event[] {
  const events = repository.events();
  const index = events.findIndex((event) => event.id === checkpoint.lastIncludedEventId);
  return index < 0 ? events : events.slice(index + 1);
}

function storeCheckpoint(repository: EpochRepository, checkpoint: Checkpoint): void {
  verifyCheckpoint(checkpoint);
  mkdirSync(checkpointsDir(repository), { recursive: true });
  writeFileSync(checkpointPath(repository, checkpoint.id), `${canonicalJson(checkpoint)}${TextToken.newline}`, JsonEncoding);
  const manifest = readManifest(repository);
  const path = basename(checkpointPath(repository, checkpoint.id));
  const checkpoints = [
    ...manifest.checkpoints.filter((entry) => entry.id !== checkpoint.id),
    { id: checkpoint.id, lastIncludedEventId: checkpoint.lastIncludedEventId, stateHash: checkpoint.stateHash, timestamp: checkpoint.timestamp, path },
  ].sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
  writeManifest(repository, { ...manifest, latestCheckpointId: checkpoint.id, checkpoints });
}

function readManifest(repository: EpochRepository): CheckpointManifest {
  const path = join(checkpointsDir(repository), CHECKPOINT_MANIFEST);
  try {
    return JSON.parse(readFileSync(path, JsonEncoding)) as CheckpointManifest;
  } catch {
    return { checkpoints: [] };
  }
}

function writeManifest(repository: EpochRepository, manifest: CheckpointManifest): void {
  mkdirSync(checkpointsDir(repository), { recursive: true });
  writeFileSync(join(checkpointsDir(repository), CHECKPOINT_MANIFEST), `${canonicalJson(manifest)}${TextToken.newline}`, JsonEncoding);
}

function unsignedCheckpoint(checkpoint: Checkpoint): UnsignedCheckpoint {
  return {
    lastIncludedEventId: checkpoint.lastIncludedEventId,
    stateHash: checkpoint.stateHash,
    timestamp: checkpoint.timestamp,
    signerPublicKey: checkpoint.signerPublicKey,
    payload: checkpoint.payload,
  };
}

function encodePayload(payload: CheckpointPayload): string {
  return Buffer.from(canonicalJson(payload), JsonEncoding).toString("base64");
}

function decodePayload(payload: string): CheckpointPayload {
  const parsed = JSON.parse(Buffer.from(payload, "base64").toString(JsonEncoding)) as CheckpointPayload;
  if (parsed.format !== CHECKPOINT_FORMAT) throw new Error("unsupported checkpoint payload format");
  for (const event of parsed.events) Schemas.unsignedEvent.parse(event);
  return {
    format: parsed.format,
    events: parsed.events.map((event) => Event.fromJSON(event).toJSON()),
    heads: Schemas.heads.parse(parsed.heads),
    blobs: parsed.blobs,
  };
}

function blobsForEvents(repository: EpochRepository, events: readonly Event[]): Record<string, string> {
  const hashes = new Set<string>();
  for (const event of events) {
    collectBlobHash(event.payload.blob_sha256, hashes);
    const patches = event.payload.patches;
    if (Array.isArray(patches)) {
      for (const patch of patches) {
        if (patch !== null && typeof patch === "object") collectBlobHash((patch as Record<string, unknown>).blob_sha256, hashes);
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

function collectBlobHash(value: unknown, hashes: Set<string>): void {
  if (typeof value === "string" && value.length === SHA256_HEX_LENGTH && /^[a-f0-9]+$/u.test(value)) hashes.add(value);
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
