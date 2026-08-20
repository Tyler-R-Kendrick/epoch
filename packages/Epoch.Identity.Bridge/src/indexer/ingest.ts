import { pairKey, type IndexEntry } from "../schemas/binding-record";
import type { NostrEvent } from "../schemas/binding-event";
import { verifyBinding } from "../verify/verifyBinding";
import type { AtProofVerifier } from "../verify/carProof";
import type { DidResolver } from "../verify/didResolve";
import type { WitnessIndexStore } from "./store";
import type { BindingRecordStore } from "../atproto/recordWriter";
import { parseBindingEvent } from "../schemas/binding-event";
import { computeEventId } from "../nostr/nip01";

/**
 * Ingest only Section-4-verified results with full proof material.
 * AT side: Jetstream collection filter (fixture list here).
 * Nostr side: kinds 30422/30423 from pinned relays.
 *
 * For seqno > 1 (including revocations), callers MUST supply `nostrChain`
 * (prior events at the same address) so Section 4 chain validation can pass.
 * Chain events may also be recovered from the store's last proof when present.
 */
export async function ingestBindingCandidate(input: {
  readonly store: WitnessIndexStore;
  readonly nostrEvent: NostrEvent;
  readonly atStore: BindingRecordStore;
  readonly didResolver: DidResolver;
  readonly atProofVerifier: AtProofVerifier;
  /** Prior binding events at the same (kind, pubkey, d) address, any order. */
  readonly nostrChain?: readonly NostrEvent[];
}): Promise<IndexEntry | undefined> {
  const fields = parseBindingEvent(input.nostrEvent);
  const atWrite = await input.atStore.get(fields.atDid, fields.pubkey);
  if (atWrite === undefined) {
    return undefined;
  }

  const pair = pairKey(fields.pubkey, fields.atDid);
  const existing = input.store.get(pair);
  const existingHead = input.store.head(pair);
  const candidateId = input.nostrEvent.id ?? computeEventId(input.nostrEvent);

  // Reconstruct prior chain only (never include the candidate itself — verifyBinding
  // already appends the head event, and duplicates break seqno uniqueness).
  const chain: NostrEvent[] = [];
  const seen = new Set<string>();
  const pushPrior = (event: NostrEvent) => {
    const id = event.id ?? computeEventId(event);
    if (id === candidateId || seen.has(id)) {
      return;
    }
    seen.add(id);
    chain.push(event);
  };
  if (input.nostrChain !== undefined) {
    for (const event of input.nostrChain) {
      pushPrior(event);
    }
  }
  if (existing?.proof?.nostrEvent !== undefined) {
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    pushPrior(existing.proof.nostrEvent as NostrEvent);
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const existingPriors = (existing?.proof as { readonly nostrChain?: readonly NostrEvent[] } | undefined)
    ?.nostrChain;
  if (existingPriors !== undefined) {
    for (const event of existingPriors) {
      pushPrior(event);
    }
  }

  // For seqno>1, refuse to invent a chain — require at least one prior event.
  if (fields.seqno > 1 && chain.length === 0) {
    return undefined;
  }

  const result = await verifyBinding({
    nostrEvent: input.nostrEvent,
    nostrChain: chain.length > 0 ? chain : undefined,
    carSliceB64: atWrite.carSliceB64,
    didResolver: input.didResolver,
    atProofVerifier: input.atProofVerifier,
    // Only pin head when advancing past a different stored head — not on re-ingest.
    pinnedHead: existingHead === undefined || existingHead.nostrEventId === candidateId
      ? undefined
      : { seqno: existingHead.seqno, id: existingHead.nostrEventId },
  });
  if (!result.valid && result.reason !== "revoked" && result.reason !== "expired") {
    return undefined;
  }

  const eventId = input.nostrEvent.id ?? computeEventId(input.nostrEvent);
  const now = new Date().toISOString();
  const entry: IndexEntry = {
    pairKey: pair,
    chainHead: {
      seqno: fields.seqno,
      nostrEventId: eventId,
      atRecordUri: atWrite.uri,
      recordCid: atWrite.cid,
      commitRev: atWrite.rev,
    },
    status: result.valid ? "valid" : result.status === "invalid" ? "conflict" : result.status,
    proof: {
      nostrEvent: input.nostrEvent,
      // Persist priors so reverifyIfStale can re-run Section 4 for multi-seqno heads.
      nostrChain: chain,
      carSliceB64: atWrite.carSliceB64,
      didDocument: await input.didResolver.resolve(fields.atDid),
      commitSigCheck: "passed",
    },
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastReverifiedAt: now,
  };
  input.store.put(entry);
  return entry;
}
