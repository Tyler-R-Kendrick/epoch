/**
 * @epoch/identity-bridge — Nostr ↔ AT Protocol mutual identity binding (v2).
 *
 * Index is a witness, never authority (Invariant 5). Ed25519 Epoch root is unchanged.
 */

export {
  NOSTR_BINDING_KIND,
  BINDING_VERSION,
  BINDING_VERSION_TAG,
  nostrEventSchema,
  bindingEventFieldsSchema,
  parseBindingEvent,
  buildBindingTags,
  tagValue,
  prevEventIdFromTags,
} from "./schemas/binding-event";
export type { NostrEvent, NostrTag, BindingEventFields } from "./schemas/binding-event";

export {
  NOSTR_ATTESTATION_KIND,
  parseAttestationEvent,
  buildAttestationTags,
  attestationEventFieldsSchema,
} from "./schemas/attestation-event";
export type { AttestationEventFields } from "./schemas/attestation-event";

export {
  bindingRecordSchema,
  indexEntrySchema,
  pairKey,
  bindingRecordRkey,
  INDEX_COLLECTION,
} from "./schemas/binding-record";
export type { BindingRecord, IndexEntry } from "./schemas/binding-record";

export { validateChain, agreeOnHead } from "./chain";
export type { ChainLink, ChainValidationResult } from "./chain";

export {
  serializeEventForId,
  computeEventId,
  signEvent,
  verifyEventSignature,
  generateNostrKeypair,
  randomBindingNonce,
} from "./nostr/nip01";

export { LocalHotNostrSigner, Nip46NostrSigner } from "./nostr/signer";
export type { NostrSigner } from "./nostr/signer";

export { publishBindingEvent, revokeBindingEvent } from "./nostr/publisher";
export type { RelayClient, RelayMode } from "./nostr/relays";

export {
  InMemoryBindingRecordStore,
  buildBindingRecord,
  BINDING_VERSION as AT_BINDING_VERSION,
} from "./atproto/recordWriter";
export type { BindingRecordStore, AtRecordWrite } from "./atproto/recordWriter";

export { ScopedOAuthClient, BINDING_RECORD_SCOPE } from "./atproto/oauthClient";
export type { AtprotoOAuthClient, OAuthTokenSet } from "./atproto/oauthClient";

export {
  publishOwnerAgentAttestation,
  scopeAllows,
  attestationIsActive,
} from "./delegation/attestation";
export type { OwnerAgentAttestation } from "./delegation/attestation";

export { signNip98Request, verifyNip98Request, NIP98_KIND } from "./delegation/nip98";
export { AgentRequestPolicy } from "./delegation/policy";
export type { PolicyDecision } from "./delegation/policy";

export { verifyBinding } from "./verify/verifyBinding";
export type { VerifyBindingInput } from "./verify/verifyBinding";
export { verifyNostrBindingEvent } from "./verify/nostrVerify";
export { StaticDidResolver, atprotoSigningKeyId } from "./verify/didResolve";
export type { DidDocument, DidResolver } from "./verify/didResolve";
export { MockAtProofVerifier } from "./verify/carProof";
export type { AtProofVerifier, AtProofBundle } from "./verify/carProof";
export {
  ProtocolAtProofVerifier,
  buildSignedProtocolProof,
  decodeProtocolProofSlice,
  encodeProtocolProofSlice,
  hashRecord,
  foldInclusionPath,
  commitDigest,
  didDocumentForCommitKey,
  PROTOCOL_PROOF_VERSION,
} from "./verify/protocolProof";
export type { ProtocolAtProofSlice, InclusionStep } from "./verify/protocolProof";
export type { BindingFailureReason, BindingStatus, VerifyBindingResult } from "./verify/errors";

export { WitnessIndexStore } from "./indexer/store";
export { WitnessIndexApi } from "./indexer/api";
export { ingestBindingCandidate } from "./indexer/ingest";

export {
  runBindingCeremony,
  revokeBindingCeremony,
  eventBindingNonce,
} from "./ceremony";
export type { CeremonyConfirmation, CeremonyResult } from "./ceremony";

export { InMemoryRelay, GuardedRelayClient, DisabledRelayClient } from "./nostr/relays";
export * from "./authority";
export * from "./authority/membership";
export * from "./authority/signers";
export * from "./conductor/evidence";
export * from "./conductor/provider";
export * from "./conductor/session";
