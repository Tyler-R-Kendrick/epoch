import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";
import type { NostrEvent, NostrTag } from "../schemas/binding-event";

/**
 * NIP-01 serialization for event id: UTF-8 JSON array
 * [0, pubkey, created_at, kind, tags, content] with no whitespace.
 */
export function serializeEventForId(event: {
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: number;
  readonly tags: readonly NostrTag[];
  readonly content: string;
}): string {
  return JSON.stringify([
    0,
    event.pubkey.toLowerCase(),
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

export function computeEventId(event: {
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: number;
  readonly tags: readonly NostrTag[];
  readonly content: string;
}): string {
  const serialized = serializeEventForId(event);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

export function signEvent(
  event: {
    readonly pubkey: string;
    readonly created_at: number;
    readonly kind: number;
    readonly tags: readonly NostrTag[];
    readonly content: string;
  },
  privateKeyHex: string,
): NostrEvent {
  const id = computeEventId(event);
  const sig = bytesToHex(schnorr.sign(hexToBytes(id), hexToBytes(privateKeyHex)));
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const tags = event.tags.map((tag) => [tag[0], ...tag.slice(1)] as [string, ...string[]]);
  return {
    id,
    kind: event.kind,
    pubkey: event.pubkey.toLowerCase(),
    created_at: event.created_at,
    tags,
    content: event.content,
    sig,
  };
}

export function verifyEventSignature(event: NostrEvent): boolean {
  const id = computeEventId(event);
  if (event.id !== undefined && event.id !== id) {
    return false;
  }
  try {
    return schnorr.verify(hexToBytes(event.sig), hexToBytes(id), hexToBytes(event.pubkey));
  } catch {
    return false;
  }
}

export function generateNostrKeypair() {
  const privateKey = bytesToHex(schnorr.utils.randomPrivateKey());
  const publicKey = bytesToHex(schnorr.getPublicKey(hexToBytes(privateKey)));
  return { privateKey, publicKey };
}

export function randomBindingNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
