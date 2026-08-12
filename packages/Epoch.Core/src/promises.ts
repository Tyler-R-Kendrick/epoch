import type { ObjectStore } from "./object-store";
import { objectIdFor, validateObjectId } from "./object-store";

export const OBJECT_PROMISE_PROTOCOL = "epoch.object-promise/v1" as const;

export type ObjectPromiseSource =
  | { readonly kind: "https"; readonly url: string; readonly credentialRef?: string }
  | { readonly kind: "peer"; readonly peerId: string };

export interface ObjectPromiseV1 {
  readonly protocol: typeof OBJECT_PROMISE_PROTOCOL;
  readonly objectId: string;
  readonly size: number;
  readonly sources: readonly ObjectPromiseSource[];
  readonly expiresAt?: string;
}
export type ObjectPromiseValidation = { readonly ok: true } |
  { readonly ok: false; readonly reason: string };

export function createObjectPromise(input: Omit<ObjectPromiseV1, "protocol">): ObjectPromiseV1 {
  const value = Object.freeze({ protocol: OBJECT_PROMISE_PROTOCOL, ...input });
  const validation = validateObjectPromise(value);
  if (!validation.ok) throw new Error(validation.reason);
  return value;
}

export function validateObjectPromise(value: unknown): ObjectPromiseValidation {
  if (typeof value !== "object" || value === null) return { ok: false, reason: "object promise must be an object" };
  const promise = value as Partial<ObjectPromiseV1>;
  if (promise.protocol !== OBJECT_PROMISE_PROTOCOL) return { ok: false, reason: "unsupported object promise protocol" };
  try { validateObjectId(promise.objectId ?? ""); } catch (error) { return { ok: false, reason: (error as Error).message }; }
  if (!Number.isSafeInteger(promise.size) || promise.size! < 0) return { ok: false, reason: "object promise size is invalid" };
  if (!Array.isArray(promise.sources) || promise.sources.length === 0) return { ok: false, reason: "object promise requires a source" };
  for (const source of promise.sources) {
    if (source.kind === "https") {
      try {
        if (new URL(source.url).protocol !== "https:") return { ok: false, reason: "object promise URL must use HTTPS" };
      } catch { return { ok: false, reason: "object promise URL is invalid" }; }
    } else if (source.kind !== "peer" || !source.peerId) return { ok: false, reason: "unsupported object promise source" };
  }
  if (promise.expiresAt !== undefined && !Number.isFinite(Date.parse(promise.expiresAt))) {
    return { ok: false, reason: "object promise expiry is invalid" };
  }
  return { ok: true };
}

export async function fulfillObjectPromise(
  promise: ObjectPromiseV1,
  store: ObjectStore,
  fetchObject: (promise: ObjectPromiseV1) => Promise<Uint8Array>,
): Promise<void> {
  const validation = validateObjectPromise(promise);
  if (!validation.ok) throw new Error(validation.reason);
  if (promise.expiresAt !== undefined && Date.parse(promise.expiresAt) <= Date.now()) throw new Error("Object promise expired");
  const bytes = Buffer.from(await fetchObject(promise));
  if (bytes.length !== promise.size) throw new Error("Promised object size mismatch");
  if (objectIdFor(bytes) !== promise.objectId) throw new Error("Promised object hash mismatch");
  await store.put(promise.objectId, bytes);
}
