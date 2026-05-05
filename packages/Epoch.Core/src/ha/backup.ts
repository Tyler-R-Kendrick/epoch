import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EpochRepository, Event, writeJson } from "../core";
import { JsonEncoding, TextToken } from "../domain";
import { canonicalJson } from "../json";
import { blobsForEvents, Checkpoint, createCheckpoint, eventsAfterCheckpoint, headsForEvents, restoreCheckpointData, verifyCheckpoint } from "./checkpoint";
import { sha256, signJson, verifyJsonSignature } from "./crypto";

const BACKUP_DIR = "backups";
const BACKUP_FORMAT = "epoch-cold-backup-v1";
const MILLISECONDS_PER_SECOND = 1000;

export interface ColdBackup {
  format: typeof BACKUP_FORMAT;
  repositoryId: string;
  checkpoint: Checkpoint;
  tailEvents: ReturnType<Event["toJSON"]>[];
  tailBlobs: Record<string, string>;
  createdAt: number;
  signerPublicKey: string;
  signature: string;
}

export interface StorageBackend {
  save(key: string, data: Buffer): void;
  load(key: string): Buffer;
}

export class LocalStorageBackend implements StorageBackend {
  constructor(readonly root: string) {}

  save(key: string, data: Buffer): void {
    mkdirSync(this.root, { recursive: true });
    writeFileSync(join(this.root, key), data);
  }

  load(key: string): Buffer {
    return readFileSync(join(this.root, key));
  }
}

export interface ColdBackupOptions {
  storage?: StorageBackend;
  key?: string;
  checkpoint?: Checkpoint;
}

export function createColdBackup(repository: EpochRepository, options: ColdBackupOptions = {}): ColdBackup {
  const checkpoint = options.checkpoint ?? createCheckpoint(repository);
  verifyCheckpoint(checkpoint);
  const identity = repository.identityDocument();
  const tailEvents = eventsAfterCheckpoint(repository, checkpoint);
  const unsigned: Omit<ColdBackup, "signature"> = {
    format: BACKUP_FORMAT,
    repositoryId: repositoryId(repository),
    checkpoint,
    tailEvents: tailEvents.map((event) => event.toJSON()),
    tailBlobs: blobsForEvents(repository, tailEvents),
    createdAt: Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
    signerPublicKey: identity.publicKey,
  };
  const backup: ColdBackup = { ...unsigned, signature: signJson(unsigned, identity.privateKey) };
  const storage = options.storage ?? new LocalStorageBackend(join(repository.epochDir, BACKUP_DIR));
  storage.save(options.key ?? `${backup.createdAt}-${checkpoint.id}.backup.json`, Buffer.from(`${canonicalJson(backup)}${TextToken.newline}`, JsonEncoding));
  return backup;
}

export function restoreFromColdBackup(repository: EpochRepository, backupOrPath: ColdBackup | string): void {
  const backup = typeof backupOrPath === "string"
    ? JSON.parse(readFileSync(backupOrPath, JsonEncoding)) as ColdBackup
    : backupOrPath;
  verifyColdBackup(backup);
  repository.init();
  rmSync(repository.eventsDir, { recursive: true, force: true });
  rmSync(repository.blobsDir, { recursive: true, force: true });
  restoreCheckpointData(repository, backup.checkpoint, true);
  for (const event of backup.tailEvents) {
    writeFileSync(join(repository.eventsDir, `${event.id}.json`), `${canonicalJson(event)}${TextToken.newline}`, JsonEncoding);
  }
  for (const [hash, data] of Object.entries(backup.tailBlobs)) {
    writeFileSync(join(repository.blobsDir, hash), Buffer.from(data, "base64"));
  }
  if (backup.tailEvents.length > 0) writeJson(repository.headsPath, headsForEvents(repository.events()));
}

export function verifyColdBackup(backup: ColdBackup): void {
  if (backup.format !== BACKUP_FORMAT) throw new Error("unsupported cold backup format");
  verifyCheckpoint(backup.checkpoint);
  const unsigned = {
    format: backup.format,
    repositoryId: backup.repositoryId,
    checkpoint: backup.checkpoint,
    tailEvents: backup.tailEvents,
    tailBlobs: backup.tailBlobs,
    createdAt: backup.createdAt,
    signerPublicKey: backup.signerPublicKey,
  };
  if (!verifyJsonSignature(unsigned, backup.signature, backup.signerPublicKey)) throw new Error("cold backup: invalid signature");
}

function repositoryId(repository: EpochRepository): string {
  return sha256(repository.identityDocument().publicKey);
}
