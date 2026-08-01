/**
 * Binding ceremony orchestration (Section 7).
 * Confirmation MUST come from pure verifyBinding, never the index alone.
 * Never accepts nsec paste as the happy path — signing goes through NostrSigner only.
 *
 * When ProtocolAtProofVerifier is used, the protocol carSlice is written into
 * BindingRecordStore so witness ingest reads the same slice that verified.
 */

import { buildBindingRecord, type BindingRecordStore } from "./atproto/recordWriter";
import { publishBindingEvent, revokeBindingEvent } from "./nostr/publisher";
import type { NostrSigner } from "./nostr/signer";
import type { RelayClient } from "./nostr/relays";
import { randomBindingNonce, computeEventId } from "./nostr/nip01";
import { verifyBinding } from "./verify/verifyBinding";
import type { AtProofVerifier } from "./verify/carProof";
import { MockAtProofVerifier } from "./verify/carProof";
import type { DidResolver } from "./verify/didResolve";
import type { NostrEvent } from "./schemas/binding-event";
import { tagValue } from "./schemas/binding-event";
import {
  buildSignedProtocolProof,
  ProtocolAtProofVerifier,
} from "./verify/protocolProof";

export type CeremonyConfirmation = {
  readonly confirmed: boolean;
  readonly displayedPlanes: {
    readonly epochAuthor: string;
    readonly nostrPubkey: string;
    readonly atDid: string;
  };
};

export type CeremonyResult = {
  readonly nostrEvent: NostrEvent;
  readonly atRecordUri: string;
  readonly carSliceB64: string;
  readonly verification: Awaited<ReturnType<typeof verifyBinding>>;
};

export async function runBindingCeremony(input: {
  readonly confirmation: CeremonyConfirmation;
  readonly signer: NostrSigner;
  readonly atDid: string;
  readonly atHandle?: string;
  readonly epochAuthor: string;
  readonly atStore: BindingRecordStore;
  readonly didResolver: DidResolver;
  readonly atProofVerifier: AtProofVerifier;
  readonly relays?: RelayClient;
  readonly seqno?: number;
  readonly prevEventId?: string;
  readonly bindingNonce?: string;
  /**
   * When using ProtocolAtProofVerifier, the AT commit signing key (hex).
   * Not an nsec; never logged. Required for protocol-shaped offline proofs.
   */
  readonly atCommitPrivateKeyHex?: string;
}): Promise<CeremonyResult> {
  if (!input.confirmation.confirmed) {
    throw new Error("ceremony requires affirmative confirmation");
  }
  if (
    input.confirmation.displayedPlanes.epochAuthor !== input.epochAuthor
    || input.confirmation.displayedPlanes.nostrPubkey !== input.signer.publicKey
    || input.confirmation.displayedPlanes.atDid !== input.atDid
  ) {
    throw new Error("ceremony plane identifiers must match displayed confirmation");
  }

  const seqno = input.seqno ?? 1;
  const bindingNonce = input.bindingNonce ?? randomBindingNonce();

  const nostrEvent = await publishBindingEvent({
    signer: input.signer,
    atDid: input.atDid,
    atHandle: input.atHandle,
    epochAuthor: input.epochAuthor,
    bindingNonce,
    seqno,
    prevEventId: input.prevEventId,
    relays: input.relays,
  });

  const record = buildBindingRecord({
    epochAuthorId: input.epochAuthor,
    nostrPubkey: input.signer.publicKey,
    bindingNonce,
    seqno,
    prevBindingEventId: input.prevEventId,
  });

  let atWrite = await input.atStore.put(input.atDid, record);
  let carSliceB64 = atWrite.carSliceB64;

  if (input.atProofVerifier instanceof ProtocolAtProofVerifier) {
    if (input.atCommitPrivateKeyHex === undefined) {
      throw new Error("protocol proof ceremony requires atCommitPrivateKeyHex");
    }
    const built = buildSignedProtocolProof({
      did: input.atDid,
      record,
      commitPrivateKeyHex: input.atCommitPrivateKeyHex,
      commitRev: atWrite.rev,
    });
    carSliceB64 = built.carSliceB64;
    // Persist the same slice ingest will read — not a placeholder record encoding.
    atWrite = await input.atStore.put(input.atDid, record, {
      carSliceB64,
      recordCid: built.slice.recordCid,
      rev: atWrite.rev,
    });
  } else if (input.atProofVerifier instanceof MockAtProofVerifier) {
    input.atProofVerifier.register(input.atDid, input.signer.publicKey, {
      record,
      carSliceB64: atWrite.carSliceB64,
      recordCid: atWrite.cid,
      commitRev: atWrite.rev,
      commitSigCheck: "passed",
    });
  }

  const verification = await verifyBinding({
    nostrEvent,
    carSliceB64,
    didResolver: input.didResolver,
    atProofVerifier: input.atProofVerifier,
  });

  return {
    nostrEvent,
    atRecordUri: atWrite.uri,
    carSliceB64,
    verification,
  };
}

export async function revokeBindingCeremony(input: {
  readonly confirmation: CeremonyConfirmation;
  readonly signer: NostrSigner;
  readonly atDid: string;
  readonly epochAuthor: string;
  readonly bindingNonce: string;
  readonly nextSeqno: number;
  readonly prevEventId: string;
  readonly atStore: BindingRecordStore;
  readonly didResolver: DidResolver;
  readonly atProofVerifier: AtProofVerifier;
  readonly relays?: RelayClient;
  readonly atHandle?: string;
  readonly nostrChain?: readonly NostrEvent[];
  readonly atCommitPrivateKeyHex?: string;
}): Promise<CeremonyResult> {
  if (!input.confirmation.confirmed) {
    throw new Error("revocation requires affirmative confirmation");
  }

  const nostrEvent = await revokeBindingEvent({
    signer: input.signer,
    atDid: input.atDid,
    epochAuthor: input.epochAuthor,
    bindingNonce: input.bindingNonce,
    nextSeqno: input.nextSeqno,
    prevEventId: input.prevEventId,
    atHandle: input.atHandle,
    relays: input.relays,
  });

  const record = buildBindingRecord({
    epochAuthorId: input.epochAuthor,
    nostrPubkey: input.signer.publicKey,
    bindingNonce: input.bindingNonce,
    seqno: input.nextSeqno,
    prevBindingEventId: input.prevEventId,
    revoked: true,
  });

  let atWrite = await input.atStore.put(input.atDid, record);
  let carSliceB64 = atWrite.carSliceB64;

  if (input.atProofVerifier instanceof ProtocolAtProofVerifier) {
    if (input.atCommitPrivateKeyHex === undefined) {
      throw new Error("protocol proof ceremony requires atCommitPrivateKeyHex");
    }
    const built = buildSignedProtocolProof({
      did: input.atDid,
      record,
      commitPrivateKeyHex: input.atCommitPrivateKeyHex,
      commitRev: atWrite.rev,
    });
    carSliceB64 = built.carSliceB64;
    atWrite = await input.atStore.put(input.atDid, record, {
      carSliceB64,
      recordCid: built.slice.recordCid,
      rev: atWrite.rev,
    });
  } else if (input.atProofVerifier instanceof MockAtProofVerifier) {
    input.atProofVerifier.register(input.atDid, input.signer.publicKey, {
      record,
      carSliceB64: atWrite.carSliceB64,
      recordCid: atWrite.cid,
      commitRev: atWrite.rev,
      commitSigCheck: "passed",
    });
  }

  const verification = await verifyBinding({
    nostrEvent,
    nostrChain: input.nostrChain,
    carSliceB64,
    didResolver: input.didResolver,
    atProofVerifier: input.atProofVerifier,
  });

  return { nostrEvent, atRecordUri: atWrite.uri, carSliceB64, verification };
}

export function eventBindingNonce(event: NostrEvent): string | undefined {
  return tagValue(event.tags, "binding-nonce");
}

export { computeEventId };
