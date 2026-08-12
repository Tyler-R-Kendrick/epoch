import { createHash } from "node:crypto";
import { objectIdFor } from "./object-store";

export interface FastCdcDescriptor {
  readonly algorithm: "fastcdc";
  readonly version: 1;
  readonly minSize: number;
  readonly averageSize: number;
  readonly maxSize: number;
  readonly normalization: 2;
  readonly seed: "epoch-fastcdc-v1";
}

export const FASTCDC_V1: FastCdcDescriptor = Object.freeze({
  algorithm: "fastcdc",
  version: 1,
  minSize: 16 * 1024,
  averageSize: 64 * 1024,
  maxSize: 256 * 1024,
  normalization: 2,
  seed: "epoch-fastcdc-v1",
});

export interface ChunkEntry {
  readonly sha256: string;
  readonly offset: number;
  readonly length: number;
}

export interface ChunkManifestV1 {
  readonly protocol: "epoch.chunk-manifest/v1";
  readonly blobSha256: string;
  readonly size: number;
  readonly entityType: string;
  readonly chunker: FastCdcDescriptor;
  readonly chunks: readonly ChunkEntry[];
}

export type ChunkVerification =
  | { readonly ok: true; readonly bytesVerified: number; readonly chunksVerified: number }
  | { readonly ok: false; readonly code: "missing-chunk" | "chunk-hash-mismatch" | "layout-mismatch" | "blob-hash-mismatch"; readonly objectId?: string };

const GEAR = Array.from({ length: 256 }, (_, index) => {
  const digest = createHash("sha256").update(`epoch-fastcdc-v1:${index}`).digest();
  return digest.readUInt32LE(0);
});

function cut(bytes: Uint8Array, start: number): number {
  const remaining = bytes.length - start;
  if (remaining <= FASTCDC_V1.minSize) return bytes.length;
  const max = Math.min(bytes.length, start + FASTCDC_V1.maxSize);
  const center = Math.min(max, start + FASTCDC_V1.averageSize);
  const strictMask = (1 << 17) - 1;
  const looseMask = (1 << 15) - 1;
  let hash = 0;
  for (let index = start + FASTCDC_V1.minSize; index < max; index += 1) {
    hash = ((hash << 1) + GEAR[bytes[index]!]) >>> 0;
    const mask = index < center ? strictMask : looseMask;
    if ((hash & mask) === 0) return index + 1;
  }
  return max;
}

export function chunkFastCdc(bytes: Uint8Array): readonly ChunkEntry[] {
  const chunks: ChunkEntry[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const end = cut(bytes, offset);
    const data = bytes.subarray(offset, end);
    chunks.push({ sha256: objectIdFor(data), offset, length: data.length });
    offset = end;
  }
  return Object.freeze(chunks.map((chunk) => Object.freeze(chunk)));
}

export function createChunkManifest(bytes: Uint8Array, entityType: string): ChunkManifestV1 {
  if (!entityType.trim()) throw new Error("Chunk manifest entity type is required");
  return Object.freeze({
    protocol: "epoch.chunk-manifest/v1",
    blobSha256: objectIdFor(bytes),
    size: bytes.length,
    entityType,
    chunker: FASTCDC_V1,
    chunks: chunkFastCdc(bytes),
  });
}

export function encodeChunkManifest(manifest: ChunkManifestV1): Buffer {
  assertChunkManifest(manifest);
  return Buffer.from(JSON.stringify(manifest));
}

export function decodeChunkManifest(bytes: Uint8Array): ChunkManifestV1 {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
  assertChunkManifest(value);
  return value;
}

export function assertChunkManifest(value: unknown): asserts value is ChunkManifestV1 {
  if (typeof value !== "object" || value === null) throw new Error("Chunk manifest must be an object");
  const manifest = value as Partial<ChunkManifestV1>;
  if (manifest.protocol !== "epoch.chunk-manifest/v1") throw new Error("Unsupported chunk manifest protocol");
  if (JSON.stringify(manifest.chunker) !== JSON.stringify(FASTCDC_V1)) throw new Error("Unsupported chunker descriptor");
  if (!Number.isSafeInteger(manifest.size) || manifest.size! < 0 || !manifest.entityType) {
    throw new Error("Invalid chunk manifest metadata");
  }
  let offset = 0;
  for (const chunk of manifest.chunks ?? []) {
    if (chunk.offset !== offset || !Number.isSafeInteger(chunk.length) || chunk.length <= 0 || !/^[a-f0-9]{64}$/u.test(chunk.sha256)) {
      throw new Error("Invalid ordered chunk layout");
    }
    offset += chunk.length;
  }
  if (offset !== manifest.size) throw new Error("Chunk manifest size does not match its layout");
  if (!/^[a-f0-9]{64}$/u.test(manifest.blobSha256 ?? "")) throw new Error("Invalid full blob SHA-256");
}

export async function verifyChunkManifest(
  manifest: ChunkManifestV1,
  read: (objectId: string) => Promise<Uint8Array | undefined>,
): Promise<ChunkVerification> {
  try { assertChunkManifest(manifest); } catch { return { ok: false, code: "layout-mismatch" }; }
  const hash = createHash("sha256");
  let bytesVerified = 0;
  for (const chunk of manifest.chunks) {
    const bytes = await read(chunk.sha256);
    if (bytes === undefined) return { ok: false, code: "missing-chunk", objectId: chunk.sha256 };
    if (bytes.length !== chunk.length || objectIdFor(bytes) !== chunk.sha256) {
      return { ok: false, code: "chunk-hash-mismatch", objectId: chunk.sha256 };
    }
    hash.update(bytes);
    bytesVerified += bytes.length;
  }
  if (bytesVerified !== manifest.size) return { ok: false, code: "layout-mismatch" };
  if (hash.digest("hex") !== manifest.blobSha256) return { ok: false, code: "blob-hash-mismatch" };
  return { ok: true, bytesVerified, chunksVerified: manifest.chunks.length };
}

export type StorageDescriptor =
  | { readonly kind: "inline" }
  | { readonly kind: "chunk-manifest"; readonly manifestSha256: string }
  | { readonly kind: "external-pointer"; readonly locator: string; readonly credentialRef?: string };

export function assertStorageDescriptor(value: unknown): asserts value is StorageDescriptor {
  if (typeof value !== "object" || value === null) throw new Error("Storage descriptor must be an object");
  const descriptor = value as Partial<StorageDescriptor>;
  if (descriptor.kind === "inline") return;
  if (descriptor.kind === "chunk-manifest" && /^[a-f0-9]{64}$/u.test(descriptor.manifestSha256 ?? "")) return;
  if (descriptor.kind === "external-pointer" && typeof descriptor.locator === "string" && descriptor.locator.length > 0) return;
  throw new Error(`Unsupported storage descriptor: ${String(descriptor.kind)}`);
}
