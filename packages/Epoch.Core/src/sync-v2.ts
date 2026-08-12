import { decodeChunkManifest } from "./chunks";
import type { ObjectStore } from "./object-store";
import { objectIdFor, validateObjectId } from "./object-store";

export const SYNC_V2_PROTOCOL = "epoch.sync/v2" as const;

export interface SyncV2Inventory {
  readonly protocol: typeof SYNC_V2_PROTOCOL;
  readonly manifests: readonly string[];
  readonly chunks: readonly string[];
  readonly cursor?: string;
}
export interface SyncV2Plan {
  readonly protocol: typeof SYNC_V2_PROTOCOL;
  readonly wantManifests: readonly string[];
  readonly wantChunks: readonly string[];
  readonly resumeCursor?: string;
}

export interface SyncV2Object {
  readonly kind: "manifest" | "chunk";
  readonly objectId: string;
  readonly bytes: Uint8Array;
}

function ids(values: readonly string[]): Set<string> {
  values.forEach(validateObjectId);
  return new Set(values);
}

export function planSyncV2(local: SyncV2Inventory, remote: SyncV2Inventory): SyncV2Plan {
  if (local.protocol !== SYNC_V2_PROTOCOL || remote.protocol !== SYNC_V2_PROTOCOL) {
    throw new Error("Unsupported sync protocol");
  }
  const localManifests = ids(local.manifests);
  const localChunks = ids(local.chunks);
  return Object.freeze({
    protocol: SYNC_V2_PROTOCOL,
    wantManifests: [...ids(remote.manifests)].filter((id) => !localManifests.has(id)).sort(),
    wantChunks: [...ids(remote.chunks)].filter((id) => !localChunks.has(id)).sort(),
    ...(remote.cursor === undefined ? {} : { resumeCursor: remote.cursor }),
  });
}

export async function applySyncV2Batch(
  store: ObjectStore,
  objects: readonly SyncV2Object[],
  limits: { readonly maxObjects?: number; readonly maxBytes?: number } = {},
): Promise<{ readonly protocol: typeof SYNC_V2_PROTOCOL; readonly applied: readonly string[] }> {
  const maxObjects = limits.maxObjects ?? 10_000;
  const maxBytes = limits.maxBytes ?? 256 * 1024 * 1024;
  if (objects.length > maxObjects) throw new Error("Sync object limit exceeded");
  const total = objects.reduce((sum, object) => sum + object.bytes.length, 0);
  if (total > maxBytes) throw new Error("Sync byte limit exceeded");

  const verified = objects.map((object) => {
    validateObjectId(object.objectId);
    const bytes = Buffer.from(object.bytes);
    if (objectIdFor(bytes) !== object.objectId) throw new Error(`Sync object hash mismatch: ${object.objectId}`);
    if (object.kind === "manifest") decodeChunkManifest(bytes);
    return { ...object, bytes };
  });
  verified.sort((left, right) => Number(left.kind === "chunk") - Number(right.kind === "chunk") ||
    left.objectId.localeCompare(right.objectId));
  for (const object of verified) await store.put(object.objectId, object.bytes);
  return Object.freeze({ protocol: SYNC_V2_PROTOCOL, applied: verified.map((object) => object.objectId) });
}
