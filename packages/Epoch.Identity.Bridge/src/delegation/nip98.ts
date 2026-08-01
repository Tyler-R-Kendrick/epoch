import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import type { NostrEvent, NostrTag } from "../schemas/binding-event";
import { computeEventId, verifyEventSignature } from "../nostr/nip01";
import type { NostrSigner } from "../nostr/signer";

/** NIP-98 HTTP auth event kind. */
export const NIP98_KIND = 27235 as const;
const FRESHNESS_SECONDS = 60;

export async function signNip98Request(input: {
  readonly signer: NostrSigner;
  readonly url: string;
  readonly method: string;
  readonly body?: string;
  readonly created_at?: number;
}): Promise<NostrEvent> {
  const payloadHash = bytesToHex(sha256(new TextEncoder().encode(input.body ?? "")));
  const tags: NostrTag[] = [
    ["u", input.url],
    ["method", input.method.toUpperCase()],
    ["payload", payloadHash],
  ];
  return input.signer.signEvent({
    created_at: input.created_at ?? Math.floor(Date.now() / 1000),
    kind: NIP98_KIND,
    tags,
    content: "",
  });
}

export type Nip98Verification =
  | { readonly ok: true; readonly pubkey: string }
  | { readonly ok: false; readonly reason: string };

export function verifyNip98Request(input: {
  readonly event: NostrEvent;
  readonly url: string;
  readonly method: string;
  readonly body?: string;
  readonly nowUnix?: number;
}): Nip98Verification {
  if (input.event.kind !== NIP98_KIND) {
    return { ok: false, reason: "bad-kind" };
  }
  const id = computeEventId(input.event);
  if (!verifyEventSignature({ ...input.event, id })) {
    return { ok: false, reason: "bad-signature" };
  }
  const now = input.nowUnix ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - input.event.created_at) > FRESHNESS_SECONDS) {
    return { ok: false, reason: "stale" };
  }
  const u = input.event.tags.find((tag) => tag[0] === "u")?.[1];
  const method = input.event.tags.find((tag) => tag[0] === "method")?.[1];
  const payload = input.event.tags.find((tag) => tag[0] === "payload")?.[1];
  if (u !== input.url) {
    return { ok: false, reason: "wrong-url" };
  }
  if (method !== input.method.toUpperCase()) {
    return { ok: false, reason: "wrong-method" };
  }
  const expected = bytesToHex(sha256(new TextEncoder().encode(input.body ?? "")));
  if (payload !== expected) {
    return { ok: false, reason: "body-mismatch" };
  }
  return { ok: true, pubkey: input.event.pubkey };
}
