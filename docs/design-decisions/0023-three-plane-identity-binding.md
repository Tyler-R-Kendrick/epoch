# ADR-0023: Three-Plane Identity Binding (Epoch · Nostr · ATProto)

**Status:** Accepted  
**Date:** 2026-08-01  
**Supersedes:** None (extends [ADR-0020](0020-community-federation-atproto-git-proxy.md) revisit criterion)  
**Related:** ADR-0020, Epoch Identity Bridge v2 (`docs/identity-bridge.md`)

## Context

Epoch authors sign with Ed25519 (`CryptoSpec.signingAlgorithm = "ed25519"`). Public Community federation already projects social artifacts through ATProto DIDs ([ADR-0020](0020-community-federation-atproto-git-proxy.md)). Buzz-compatible rooms (Block Buzz / Nostr relays) require secp256k1 BIP-340 identities. These key systems are not convertible, so interoperability cannot be key derivation.

ADR-0020 accepts two identity systems (DID + Epoch author) until binding UX is mature, with revisit criterion: *“DID and Epoch signing keys are unified under one portable key lifecycle.”* This decision advances that path without replacing Epoch Core verification.

## Decision

Adopt a **three-plane identity model** linked by **mutual, dual-signed, hash-chained attestations**:

| Plane | Identifier | Role |
|---|---|---|
| Epoch author (root) | Ed25519 | Local source of truth for `EpochRepository.verify()` |
| Nostr presence | secp256k1 (BIP-340) | Buzz-compatible room membership / agent presence |
| ATProto projection | `did:plc` / `did:web` + handle | Public federated social identity |

**Package:** `@epoch/identity-bridge` (`packages/Epoch.Identity.Bridge`)

**Normative wire formats (v2):**

- Nostr addressable kind **30422** binding events (`d` = target DID)
- AT lexicon **`org.epoch.identity.binding`** (rkey = Nostr pubkey hex)
- Owner→agent attestation kind **30423** + Epoch-side Ed25519 mirror payload
- Witness index storing only Section-4-verified proof bundles (never authoritative)

**Verification** is current-state and client-side (`verifyBinding`). Timestamps never order chains; `seqno` + prev event ids do. Revocation is a terminal `revoked: true` chain link.

## Consequences

### Implementation update (2026-08-11)

The identity bridge verifier and witness-index boundary remain shipped. The
frontier authority model adds stable human/agent/service/device/organization
principals, public-key bindings, attenuated grants, budget reservations, and
receipts without replacing any plane-specific identifier. Its current ledger
is in memory; a production host must inject durable transactional persistence.
Provider calls remain non-authoritative and disclose only digest/metadata
telemetry permitted by the grant.

### Positive

- Buzz room participation without weakening Ed25519 root verification
- Plane-scoped compromise: rotate Nostr without touching Epoch/AT roots
- Pure verifier enables third-party checks with index offline
- Mechanism swappability (NIP-46 → FROSTR; OAuth → UCAN) behind interfaces

### Negative / costs

- Two extra planes to operate (relays + PDS OAuth)
- AT signing-key rotation can degrade historical proof re-verification (documented freshness caveat)
- Ceremony UX and custody reviews are ongoing product work

### Explicit non-goals

Content bridging, NIP-26, FROSTR implementation, default DID-document `alsoKnownAs` mirroring, changes to `CryptoSpec` or Epoch Core verify rules.

## Revisit criteria

1. **Portable key unification** — if `did:plc` ed25519-verificationMethod (or equivalent) allows a single portable lifecycle covering Epoch authorship and AT writes, re-evaluate whether dual-signed attestations remain necessary for the AT plane.
2. **Custody** — when FROSTR/threshold Nostr custody is production-ready, swap behind `NostrSigner` without schema change.
3. **Abuse / UX** — if binding spam or ceremony drop-off shows the mutual-proof model is too heavy, revisit progressive disclosure (not verification strength).

## References

- `docs/identity-bridge.md`
- `packages/Epoch.Identity.Bridge`
- NIP-01, NIP-46, NIP-98; ATProto repo/sync specs; did:plc v0.3
