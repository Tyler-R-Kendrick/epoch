import {
  buildAttestationTags,
  NOSTR_ATTESTATION_KIND,
  parseAttestationEvent,
  type AttestationEventFields,
} from "../schemas/attestation-event";
import type { NostrEvent } from "../schemas/binding-event";
import type { NostrSigner } from "../nostr/signer";
import type { RelayClient } from "../nostr/relays";

export type OwnerAgentAttestation = {
  readonly event: NostrEvent;
  readonly fields: AttestationEventFields;
  /** Epoch-side Ed25519 mirror payload (signed separately by Epoch Core). */
  readonly epochMirror: {
    readonly type: "epoch.identity.agent-attestation";
    readonly ownerEpochAuthor: string;
    readonly ownerNostrPubkey: string;
    readonly agentNostrPubkey: string;
    readonly scope: string;
    readonly expires: number;
    readonly seqno: number;
    readonly revoked: boolean;
    readonly nostrEventId: string;
  };
};

export async function publishOwnerAgentAttestation(input: {
  readonly ownerSigner: NostrSigner;
  readonly agentPubkey: string;
  readonly epochAuthor: string;
  readonly scope: string;
  readonly expires: number;
  readonly seqno?: number;
  readonly revoked?: boolean;
  readonly relays?: RelayClient;
}): Promise<OwnerAgentAttestation> {
  const seqno = input.seqno ?? 1;
  const expires = input.expires;
  if (expires <= Math.floor(Date.now() / 1000)) {
    throw new Error("attestation expires must be in the future");
  }
  // Recommend ≤ 90 days
  const max = Math.floor(Date.now() / 1000) + 90 * 24 * 3600;
  if (expires > max + 60) {
    throw new Error("attestation expires exceeds recommended 90-day maximum");
  }

  const event = await input.ownerSigner.signEvent({
    created_at: Math.floor(Date.now() / 1000),
    kind: NOSTR_ATTESTATION_KIND,
    tags: buildAttestationTags({
      agentPubkey: input.agentPubkey.toLowerCase(),
      epochAuthor: input.epochAuthor,
      scope: input.scope,
      expires,
      seqno,
      revoked: input.revoked,
    }),
    content: "Owner attestation: this agent acts on my behalf within scope.",
  });

  if (input.relays !== undefined) {
    await input.relays.publish(event);
  }

  const fields = parseAttestationEvent(event);
  return {
    event,
    fields,
    epochMirror: {
      type: "epoch.identity.agent-attestation",
      ownerEpochAuthor: input.epochAuthor,
      ownerNostrPubkey: input.ownerSigner.publicKey,
      agentNostrPubkey: input.agentPubkey.toLowerCase(),
      scope: input.scope,
      expires,
      seqno,
      revoked: input.revoked === true,
      nostrEventId: event.id ?? "",
    },
  };
}

/**
 * Scope attenuation: service may accept less than granted, never more.
 */
export function scopeAllows(granted: string, required: string): boolean {
  const grantedSet = new Set(granted.split(/[;,]/u).map((s) => s.trim()).filter(Boolean));
  const requiredParts = required.split(/[;,]/u).map((s) => s.trim()).filter(Boolean);
  return requiredParts.every((part) => grantedSet.has(part));
}

export function attestationIsActive(
  fields: AttestationEventFields,
  nowUnix = Math.floor(Date.now() / 1000),
): boolean {
  if (fields.revoked) {
    return false;
  }
  if (fields.expires <= nowUnix) {
    return false;
  }
  return true;
}
