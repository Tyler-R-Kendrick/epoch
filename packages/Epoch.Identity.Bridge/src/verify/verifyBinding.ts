import { agreeOnHead, validateChain } from "../chain";
import { pairKey, type BindingRecord } from "../schemas/binding-record";
import type { NostrEvent } from "../schemas/binding-event";
import type { AtProofVerifier } from "./carProof";
import type { DidResolver } from "./didResolve";
import { fail, type VerifyBindingResult } from "./errors";
import { verifyNostrBindingEvent } from "./nostrVerify";

export type VerifyBindingInput = {
  readonly nostrEvent: NostrEvent;
  /** Optional full chain of prior Nostr binding events at the same address (oldest→newest or any order). */
  readonly nostrChain?: readonly NostrEvent[];
  readonly carSliceB64: string;
  readonly didResolver: DidResolver;
  readonly atProofVerifier: AtProofVerifier;
  /** Verifier-local or index-witnessed pinned head for T3 rollback defense. */
  readonly pinnedHead?: { readonly seqno: number; readonly id: string };
  /** Clock for expiry checks (defaults to Date.now()/1000). */
  readonly nowUnix?: number;
};

/**
 * Normative Section 4 verifier. Pure apart from injected fetch/proof interfaces.
 * Timestamps are never used for ordering.
 */
export async function verifyBinding(input: VerifyBindingInput): Promise<VerifyBindingResult> {
  // Step 1 — Nostr authenticity
  const nostr = verifyNostrBindingEvent(input.nostrEvent);
  if (!nostr.ok) {
    return nostr.result;
  }
  const { fields, eventId } = nostr;

  // Steps 2 — AT proof authenticity
  let didDocument;
  try {
    didDocument = await input.didResolver.resolve(fields.atDid);
  } catch {
    return fail("did-unresolvable");
  }

  let atProof;
  try {
    atProof = await input.atProofVerifier.verifyRecordProof({
      did: fields.atDid,
      nostrPubkey: fields.pubkey,
      carSliceB64: input.carSliceB64,
      didDocument,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("proof-missing")) {
      return fail("proof-missing");
    }
    return fail("proof-invalid");
  }

  const record: BindingRecord = atProof.record;

  // Step 3 — Cross-match
  if (
    record.bindingNonce !== fields.bindingNonce
    || record.bindingVersion !== 2
    || record.epochAuthorId !== fields.epochAuthor
    || record.nostrPubkey.toLowerCase() !== fields.pubkey.toLowerCase()
    || fields.d !== fields.atDid
  ) {
    return fail("mismatch-fields");
  }
  if (record.seqno !== fields.seqno) {
    return fail("mismatch-fields");
  }
  if ((record.prevBindingEventId ?? undefined) !== (fields.prevEventId ?? undefined)) {
    return fail("mismatch-fields");
  }
  if (record.revoked !== fields.revoked) {
    return fail("mismatch-fields");
  }

  // Step 4 — Chain validation
  const chainEvents = [...(input.nostrChain ?? []), input.nostrEvent];
  const links = [];
  for (const event of chainEvents) {
    const verified = verifyNostrBindingEvent(event);
    if (!verified.ok) {
      return fail("chain-broken");
    }
    // Same address (kind, pubkey, d)
    if (verified.fields.pubkey !== fields.pubkey || verified.fields.d !== fields.d) {
      return fail("chain-broken");
    }
    links.push({
      seqno: verified.fields.seqno,
      id: verified.eventId,
      prevId: verified.fields.prevEventId,
      revoked: verified.fields.revoked,
    });
  }

  const chain = validateChain(links, input.pinnedHead);
  if (!chain.ok) {
    return fail(chain.reason);
  }

  if (!agreeOnHead(
    { seqno: fields.seqno, prevEventId: fields.prevEventId, eventId },
    { seqno: record.seqno, prevBindingEventId: record.prevBindingEventId },
  )) {
    return fail("chain-broken");
  }

  // Step 5 — Revocation and expiry (verifier clock only)
  if (fields.revoked || record.revoked) {
    return {
      valid: false,
      status: "revoked",
      reason: "revoked",
    };
  }

  const now = input.nowUnix ?? Math.floor(Date.now() / 1000);
  if (fields.expiration !== undefined && fields.expiration < now) {
    return {
      valid: false,
      status: "expired",
      reason: "expired",
    };
  }
  if (record.expiration !== undefined) {
    const expMs = Date.parse(record.expiration);
    if (!Number.isNaN(expMs) && expMs < now * 1000) {
      return {
        valid: false,
        status: "expired",
        reason: "expired",
      };
    }
  }

  return {
    valid: true,
    status: "valid",
    head: {
      seqno: fields.seqno,
      nostrEventId: eventId,
      pairKey: pairKey(fields.pubkey, fields.atDid),
    },
  };
}
