import { createHash } from "node:crypto";
import {
  assertStorageDescriptor,
  decodeChunkManifest,
  type StorageDescriptor,
  verifyChunkManifest,
} from "./chunks";
import type { ObjectStore } from "./object-store";
import { objectIdFor, validateObjectId } from "./object-store";
import type { ObjectPromiseV1 } from "./promises";

export interface BlobReferenceV2 {
  readonly blobSha256: string;
  readonly size: number;
  readonly entityType: string;
  readonly storage?: StorageDescriptor;
}
export type BlobAvailability =
  | { readonly status: "resident"; readonly bytesVerified: number }
  | { readonly status: "promised"; readonly promise: ObjectPromiseV1 }
  | { readonly status: "missing"; readonly reason: string }
  | { readonly status: "invalid"; readonly reason: string };

export const EMPTY_BLOB_SHA256 = objectIdFor(Buffer.alloc(0));

export function assertBlobReference<Value>(value: Value): asserts value is Value & BlobReferenceV2 {
  if (typeof value !== "object" || value === null) throw new Error("Blob reference must be an object");
  // SAFETY: Runtime checks or construction above establish Partial<BlobReferenceV2>.
  const reference = value as Partial<BlobReferenceV2>;
  validateObjectId(reference.blobSha256 ?? "");
  if (!Number.isSafeInteger(reference.size) || reference.size! < 0 || !reference.entityType?.trim()) {
    throw new Error("Blob reference metadata is invalid");
  }
  if (reference.storage !== undefined) assertStorageDescriptor(reference.storage);
}

export async function verifyBlobAvailability(
  reference: BlobReferenceV2,
  store: ObjectStore,
  promises: ReadonlyMap<string, ObjectPromiseV1> = new Map(),
): Promise<BlobAvailability> {
  try { assertBlobReference(reference); } catch (error) { return { status: "invalid", reason: error instanceof Error ? error.message : String(error) }; }
  const storage = reference.storage ?? { kind: "inline" as const };
  if (reference.size === 0) {
    return reference.blobSha256 === EMPTY_BLOB_SHA256
      ? { status: "resident", bytesVerified: 0 }
      : { status: "invalid", reason: "zero-length blob has an invalid full-content hash" };
  }
  if (storage.kind === "external-pointer") {
    const promised = promises.get(reference.blobSha256);
    return promised === undefined
      ? { status: "missing", reason: "external object is not resident and has no promise" }
      : { status: "promised", promise: promised };
  }
  if (storage.kind === "inline") {
    const bytes = await store.get(reference.blobSha256);
    if (bytes === undefined) {
      const promised = promises.get(reference.blobSha256);
      return promised === undefined ? { status: "missing", reason: "inline object is absent" } : { status: "promised", promise: promised };
    }
    return bytes.length === reference.size && objectIdFor(bytes) === reference.blobSha256
      ? { status: "resident", bytesVerified: bytes.length }
      : { status: "invalid", reason: "inline object does not match full-content identity" };
  }
  const manifestBytes = await store.get(storage.manifestSha256);
  if (manifestBytes === undefined) {
    const promised = promises.get(storage.manifestSha256);
    return promised === undefined ? { status: "missing", reason: "chunk manifest is absent" } : { status: "promised", promise: promised };
  }
  try {
    const manifest = decodeChunkManifest(manifestBytes);
    if (manifest.blobSha256 !== reference.blobSha256 || manifest.size !== reference.size || manifest.entityType !== reference.entityType) {
      return { status: "invalid", reason: "manifest does not match the blob reference" };
    }
    const verified = await verifyChunkManifest(manifest, (id) => store.get(id));
    return verified.ok ? { status: "resident", bytesVerified: verified.bytesVerified }
      : { status: "invalid", reason: `${verified.code}: ${verified.objectId ?? "manifest"}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "invalid", reason };
  }
}

export type RangeFetchResult =
  | { readonly status: "ok"; readonly bytes: Buffer; readonly verifiedBy: "full-object" | "chunk-manifest" }
  | { readonly status: "requires-full-object"; readonly reason: string }
  | { readonly status: "rejected"; readonly reason: string };

export async function fetchVerifiedRange(
  reference: BlobReferenceV2,
  store: ObjectStore,
  start: number,
  end: number,
  policy: "allow-full" | "range-only" = "range-only",
): Promise<RangeFetchResult> {
  try { assertBlobReference(reference); } catch (error) { return { status: "rejected", reason: error instanceof Error ? error.message : String(error) }; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > reference.size) {
    return { status: "rejected", reason: "invalid byte range" };
  }
  const storage = reference.storage ?? { kind: "inline" as const };
  if (storage.kind === "external-pointer") return { status: "rejected", reason: "external range is not locally provable" };
  if (storage.kind === "inline") {
    if (policy === "range-only" && (start !== 0 || end !== reference.size)) {
      return { status: "requires-full-object", reason: "inline storage can verify only the full object" };
    }
    const bytes = await store.get(reference.blobSha256);
    if (bytes === undefined || bytes.length !== reference.size || objectIdFor(bytes) !== reference.blobSha256) {
      return { status: "rejected", reason: "inline object is absent or invalid" };
    }
    return { status: "ok", bytes: bytes.subarray(start, end), verifiedBy: "full-object" };
  }
  const manifestBytes = await store.get(storage.manifestSha256);
  if (manifestBytes === undefined) return { status: "rejected", reason: "chunk manifest is absent" };
  const manifest = decodeChunkManifest(manifestBytes);
  if (manifest.blobSha256 !== reference.blobSha256) return { status: "rejected", reason: "manifest identity mismatch" };
  const output: Buffer[] = [];
  for (const chunk of manifest.chunks) {
    const chunkEnd = chunk.offset + chunk.length;
    if (chunkEnd <= start || chunk.offset >= end) continue;
    const bytes = await store.get(chunk.sha256);
    if (bytes === undefined || objectIdFor(bytes) !== chunk.sha256) return { status: "rejected", reason: `chunk is absent or invalid: ${chunk.sha256}` };
    output.push(bytes.subarray(Math.max(0, start - chunk.offset), Math.min(chunk.length, end - chunk.offset)));
  }
  return { status: "ok", bytes: Buffer.concat(output), verifiedBy: "chunk-manifest" };
}

export function fullContentHash(parts: Iterable<Uint8Array>): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest("hex");
}
