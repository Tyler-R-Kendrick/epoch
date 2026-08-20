import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/u;

export type ObjectId = string;

export interface ObjectStore {
  has(objectId: ObjectId): Promise<boolean>;
  get(objectId: ObjectId): Promise<Buffer | undefined>;
  put(objectId: ObjectId, bytes: Uint8Array): Promise<void>;
}
export function objectIdFor(bytes: Uint8Array): ObjectId {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateObjectId(objectId: string): ObjectId {
  if (!SHA256.test(objectId)) throw new Error("Object ID must be a lowercase SHA-256 digest");
  return objectId;
}

function verifiedBytes(objectId: string, bytes: Uint8Array): Buffer {
  validateObjectId(objectId);
  const copy = Buffer.from(bytes);
  if (objectIdFor(copy) !== objectId) throw new Error(`Object hash mismatch: ${objectId}`);
  return copy;
}

export class MemoryObjectStore implements ObjectStore {
  readonly #objects = new Map<ObjectId, Buffer>();

  async has(objectId: ObjectId): Promise<boolean> {
    validateObjectId(objectId);
    return this.#objects.has(objectId);
  }

  async get(objectId: ObjectId): Promise<Buffer | undefined> {
    validateObjectId(objectId);
    const bytes = this.#objects.get(objectId);
    return bytes === undefined ? undefined : Buffer.from(bytes);
  }

  async put(objectId: ObjectId, bytes: Uint8Array): Promise<void> {
    const verified = verifiedBytes(objectId, bytes);
    const current = this.#objects.get(objectId);
    if (current !== undefined && !current.equals(verified)) {
      throw new Error(`Immutable object already exists with different bytes: ${objectId}`);
    }
    this.#objects.set(objectId, verified);
  }
}

export class FileObjectStore implements ObjectStore {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(objectId: ObjectId): string {
    validateObjectId(objectId);
    return join(this.root, objectId.slice(0, 2), objectId.slice(2));
  }

  async has(objectId: ObjectId): Promise<boolean> {
    try {
      return (await stat(this.path(objectId))).isFile();
    } catch (error) {
      // SAFETY: Runtime checks or construction above establish NodeJS.ErrnoException).code === "ENOENT") return false.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async get(objectId: ObjectId): Promise<Buffer | undefined> {
    try {
      const bytes = await readFile(this.path(objectId));
      return verifiedBytes(objectId, bytes);
    } catch (error) {
      // SAFETY: Runtime checks or construction above establish NodeJS.ErrnoException).code === "ENOENT") return undefined.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async put(objectId: ObjectId, bytes: Uint8Array): Promise<void> {
    const verified = verifiedBytes(objectId, bytes);
    const target = this.path(objectId);
    const existing = await this.get(objectId);
    if (existing !== undefined) {
      if (!existing.equals(verified)) throw new Error(`Immutable object collision: ${objectId}`);
      return;
    }
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, verified, { flag: "wx" });
    try {
      await rename(temporary, target);
    } catch (error) {
      if (await this.has(objectId)) return;
      throw error;
    }
  }
}
