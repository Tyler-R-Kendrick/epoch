/**
 * Apply OpenZL frames to sync-v2 object bytes when negotiation selected openzl.
 * Plaintext objectId / chunk digests are unchanged (ADR-0053).
 *
 * Kept in the same module as the codec to avoid circular imports.
 */
import {
  OPENZL_CODEC_ID,
  compressOpenZl,
  decompressOpenZl,
  isOpenZlFrame,
} from "./codec-core";

export interface SyncV2ObjectBytes {
  readonly objectId: string;
  readonly kind: string;
  readonly bytes: Uint8Array;
  readonly entityType?: string;
}

export function encodeObjectForSync(
  object: SyncV2ObjectBytes,
  compression: string,
): SyncV2ObjectBytes {
  if (compression !== OPENZL_CODEC_ID && compression !== "openzl") return object;
  if (isOpenZlFrame(object.bytes)) return object;
  const packed = compressOpenZl(object.bytes, {
    entityType: object.entityType || "application/octet-stream",
  });
  return { ...object, bytes: packed.frame };
}

export function decodeObjectFromSync(
  object: SyncV2ObjectBytes,
  compression: string,
): SyncV2ObjectBytes {
  if (compression !== OPENZL_CODEC_ID && compression !== "openzl") return object;
  if (!isOpenZlFrame(object.bytes)) return object;
  return { ...object, bytes: decompressOpenZl(object.bytes) };
}
