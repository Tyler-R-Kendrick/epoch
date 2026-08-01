import {
  BINDING_VERSION_TAG,
  buildBindingTags,
  NOSTR_BINDING_KIND,
  type NostrEvent,
} from "../schemas/binding-event";
import { randomBindingNonce } from "./nip01";
import type { NostrSigner } from "./signer";
import type { RelayClient } from "./relays";

export type PublishBindingInput = {
  readonly signer: NostrSigner;
  readonly atDid: string;
  readonly atHandle?: string;
  readonly epochAuthor: string;
  readonly bindingNonce?: string;
  readonly seqno: number;
  readonly prevEventId?: string;
  readonly revoked?: boolean;
  readonly expiration?: number;
  readonly created_at?: number;
  readonly relays?: RelayClient;
};

export async function publishBindingEvent(input: PublishBindingInput): Promise<NostrEvent> {
  if (input.seqno > 1 && input.prevEventId === undefined && input.revoked !== true) {
    // first event seqno 1 has no prev; later require prev
  }
  if (input.seqno > 1 && input.prevEventId === undefined) {
    throw new Error("chain-broken: seqno>1 requires prevEventId");
  }
  if (input.seqno === 1 && input.prevEventId !== undefined) {
    throw new Error("chain-broken: seqno 1 must not have prevEventId");
  }

  const tags = buildBindingTags({
    d: input.atDid,
    epochAuthor: input.epochAuthor,
    atDid: input.atDid,
    atHandle: input.atHandle,
    bindingNonce: input.bindingNonce ?? randomBindingNonce(),
    seqno: input.seqno,
    prevEventId: input.prevEventId,
    revoked: input.revoked,
    expiration: input.expiration,
  });

  const event = await input.signer.signEvent({
    created_at: input.created_at ?? Math.floor(Date.now() / 1000),
    kind: NOSTR_BINDING_KIND,
    tags,
    content: "Epoch identity binding v2: nostr<->atproto. Verify both directions.",
  });

  if (input.relays !== undefined) {
    await input.relays.publish(event);
  }

  return event;
}

export async function revokeBindingEvent(input: {
  readonly signer: NostrSigner;
  readonly atDid: string;
  readonly epochAuthor: string;
  readonly bindingNonce: string;
  readonly nextSeqno: number;
  readonly prevEventId: string;
  readonly atHandle?: string;
  readonly relays?: RelayClient;
}): Promise<NostrEvent> {
  return publishBindingEvent({
    signer: input.signer,
    atDid: input.atDid,
    atHandle: input.atHandle,
    epochAuthor: input.epochAuthor,
    bindingNonce: input.bindingNonce,
    seqno: input.nextSeqno,
    prevEventId: input.prevEventId,
    revoked: true,
    relays: input.relays,
  });
}

export { BINDING_VERSION_TAG };
