import { CommunityError } from "./errors";
import type { CommunityFieldScalar } from "./search-expression";

export interface KeysetCursorPayload {
  readonly version: number;
  readonly snapshotId: string;
  readonly planHash: string;
  readonly authorizationFingerprint: string;
  readonly sortKey: readonly CommunityFieldScalar[];
  readonly objectId: string;
}

export interface KeysetCursorBinding {
  readonly snapshotId: string;
  readonly planHash: string;
  readonly authorizationFingerprint: string;
}

export interface KeysetCursorCodec {
  encode(payload: KeysetCursorPayload): Promise<string>;
  decode(cursor: string, binding: KeysetCursorBinding): Promise<KeysetCursorPayload>;
}

type CursorJsonValue = string | number | boolean | null | CursorJsonObject | readonly CursorJsonValue[];
interface CursorJsonObject { readonly [key: string]: CursorJsonValue }

export function createKeysetCursorCodec(options: {
  readonly key: Uint8Array;
  readonly maxBytes?: number;
}): KeysetCursorCodec {
  const maxBytes = options.maxBytes ?? 4096;
  if (options.key.byteLength < 32) throw new CommunityError("CURSOR_INVALID", "Cursor signing key must contain at least 256 bits");
  const keyBytes = new Uint8Array(options.key);
  return Object.freeze({
    encode: async (payload: KeysetCursorPayload): Promise<string> => {
      validatePayload(payload);
      const body = new TextEncoder().encode(JSON.stringify(payload));
      if (body.byteLength > maxBytes) throw new CommunityError("CURSOR_INVALID", "Cursor exceeds the supported size");
      return base64Url(await seal(body, keyBytes));
    },
    decode: async (cursor: string, binding: KeysetCursorBinding): Promise<KeysetCursorPayload> => {
      if (cursor.length > maxBytes * 2) throw new CommunityError("CURSOR_INVALID", "Cursor is malformed or oversized");
      let body: Uint8Array;
      try {
        body = await open(fromBase64Url(cursor), keyBytes);
      } catch {
        throw new CommunityError("CURSOR_INVALID", "Cursor authentication failed");
      }
      if (body.byteLength > maxBytes) throw new CommunityError("CURSOR_INVALID", "Cursor payload is oversized");
      let payload: CursorJsonValue;
      try {
        // SAFETY: JSON.parse returns only values in the JSON value domain.
        payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as CursorJsonValue;
      }
      catch { throw new CommunityError("CURSOR_INVALID", "Cursor payload is invalid"); }
      validatePayload(payload);
      // SAFETY: The surrounding validation and domain contract establish the asserted type.
      const valid = payload as KeysetCursorPayload;
      if (valid.snapshotId !== binding.snapshotId || valid.planHash !== binding.planHash
        || valid.authorizationFingerprint !== binding.authorizationFingerprint) {
        throw new CommunityError("CURSOR_STALE", "Cursor does not belong to this query snapshot or authorization context");
      }
      return valid;
    },
  });
}

const CURSOR_AAD = new TextEncoder().encode("epoch-community-cursor-v1");

async function seal(body: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined || globalThis.crypto?.getRandomValues === undefined) throw new CommunityError("CRYPTO_UNAVAILABLE", "Cursor encryption is unavailable in this runtime");
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle.importKey("raw", arrayBuffer(keyBytes), "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: arrayBuffer(nonce), additionalData: arrayBuffer(CURSOR_AAD) }, key, arrayBuffer(body)));
  const envelope = new Uint8Array(1 + nonce.byteLength + ciphertext.byteLength);
  envelope[0] = 1;
  envelope.set(nonce, 1);
  envelope.set(ciphertext, 13);
  return envelope;
}

async function open(envelope: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new CommunityError("CRYPTO_UNAVAILABLE", "Cursor decryption is unavailable in this runtime");
  if (envelope[0] !== 1 || envelope.byteLength < 30) throw new Error("invalid cursor envelope");
  const key = await subtle.importKey("raw", arrayBuffer(keyBytes), "AES-GCM", false, ["decrypt"]);
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: arrayBuffer(envelope.slice(1, 13)), additionalData: arrayBuffer(CURSOR_AAD) }, key, arrayBuffer(envelope.slice(13)));
  return new Uint8Array(plaintext);
}

function validatePayload(value: CursorJsonValue | KeysetCursorPayload): asserts value is (CursorJsonObject | KeysetCursorPayload) & KeysetCursorPayload {
  if (typeof value !== "object" || value === null) throw new CommunityError("CURSOR_INVALID", "Cursor payload must be an object");
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  const payload = value as Partial<KeysetCursorPayload>;
  if (payload.version !== 1 || !bounded(payload.snapshotId) || !bounded(payload.planHash)
    || !bounded(payload.authorizationFingerprint) || !bounded(payload.objectId)
    || !Array.isArray(payload.sortKey) || payload.sortKey.length > 32
    || payload.sortKey.some(invalidScalar)) {
    throw new CommunityError("CURSOR_INVALID", "Cursor payload fields are invalid");
  }
}

function invalidScalar(value: CommunityFieldScalar): boolean {
  return value !== null && !isStringScalar(value) && !isBooleanScalar(value)
    && (!isNumberScalar(value) || !Number.isFinite(value));
}

function bounded(value: CursorJsonValue | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

function isStringScalar(value: CommunityFieldScalar): value is string { return typeof value === "string"; }
function isNumberScalar(value: CommunityFieldScalar): value is number { return typeof value === "number"; }
function isBooleanScalar(value: CommunityFieldScalar): value is boolean { return typeof value === "boolean"; }

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("invalid base64url");
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function arrayBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer;
}
