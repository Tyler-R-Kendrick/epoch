# Epoch Identity Bridge (v2)

Mutual, self-certifying bindings between **Epoch authors (Ed25519)**, **Nostr presence (BIP-340)**, and **ATProto DIDs**. Package: `@epoch/identity-bridge`.

Governing ADRs: [ADR-0020](design-decisions/0020-community-federation-atproto-git-proxy.md), [ADR-0023](design-decisions/0023-three-plane-identity-binding.md).

## What this is (and is not)

| Is | Is not |
|---|---|
| Dual-signed proofs that one principal controls two/three plane IDs | Content bridge / crossposting |
| Client-side verification from protocol data | Custodial account mapper (bridge-owned keys) |
| Witness index (cache of verified proofs) | Authority that invents bindings |
| Progressive opt-in linking | Replacement for Epoch Ed25519 root |

## Invariants

1. **Ed25519 stays root** — Core verify unchanged.
2. **Mutual binding** — both Nostr 30422 and AT `org.epoch.identity.binding` required, shared 32-byte nonce + chain position.
3. **Hash-chained ordering** — `seqno` + prev event id; never `created_at` for security.
4. **Revocation is terminal** — `revoked: true` at same address.
5. **Verification is client-side** — index re-verifies or exposes proofs; never soft-authoritative.
6. **Plane-scoped compromise** — rotate Nostr without touching Epoch/AT.
7. **Mechanism swappability** — signers, OAuth, relays behind interfaces.
8. **Progressive enhancement** — pure Epoch works with zero linking.

## Wire formats

### Nostr kind 30422 (addressable)

Tags: `d` (DID), `epoch-author`, `at-did`, `at-handle?`, `binding-nonce` (64 hex), `binding-version`=`2`, `seqno`, optional `e`/`prev`, `revoked`, optional `expiration`.

### AT record `org.epoch.identity.binding`

Rkey = Nostr pubkey hex. Fields mirror Nostr chain position (`bindingNonce`, `seqno`, `prevBindingEventId`, `revoked`).

### Owner→agent kind 30423

Addressable by agent pubkey; mandatory `expires` + `scope`; mirrored as Epoch attestation payload for `epoch verify`.

## Verification

```ts
import {
  verifyBinding,
  StaticDidResolver,
  ProtocolAtProofVerifier,
  buildSignedProtocolProof,
} from "@epoch/identity-bridge";

const result = await verifyBinding({
  nostrEvent,
  nostrChain,      // prior events at address
  carSliceB64,     // protocol-shaped getRecord-style proof slice (base64url JSON)
  didResolver,
  atProofVerifier: new ProtocolAtProofVerifier(),
  pinnedHead,      // rollback defense
});
```

**AT proofs:** `ProtocolAtProofVerifier` recomputes record leaf hash, folds an inclusion path to a commit root, and checks a Schnorr signature against the DID document `#atproto` key. Tampered slices or bad commit signatures fail closed (`proof-invalid` / `proof-missing`). This is not a pre-registered accept list. Full wire CAR/MST bytes from a live PDS can replace the offline slice encoder behind the same `AtProofVerifier` interface.

Failure reasons: `bad-signature`, `bad-kind`, `bad-nonce`, `proof-missing`, `proof-invalid`, `mismatch-fields`, `chain-broken`, `chain-regression`, `revoked`, `expired`, `did-unresolvable`.

## Ceremony

1. Display all plane IDs; require affirmative confirm.  
2. Generate nonce + seqno client-side.  
3. Sign Nostr via NIP-07/NIP-46 (never paste nsec).  
4. Write AT record via scoped OAuth (`repo:org.epoch.identity.binding` only).  
5. Immediately `verifyBinding` (not index alone).  
6. Per-plane one-click revocation (`revoked: true` link).

`runBindingCeremony` / `revokeBindingCeremony` implement this in `@epoch/identity-bridge`.

## Witness index

Ingest verified candidates only (`ingestBindingCandidate`). Query: `byNostr`, `byDid`, `proof`, `head`. TTL re-verify on read. Compromised index ⇒ stale/DoS, never false authority.

## Threat vectors (automated)

Covered in `test/unit/identity-bridge.test.ts` and `features/identity_bridge.feature`:

| # | Attack | Coverage |
|---|---|---|
| T1 | Backdated `created_at` | Unit: timestamps ignored; chain decides |
| T2 | Future-dated without valid prev | Unit: `chain-broken` |
| T3 | Rollback after revocation | Unit + Gherkin: verifier pin + index `head` → `chain-regression` |
| T4 | Mix-and-match pairs | Unit + Gherkin: `mismatch-fields` |
| T5 | Nonce/chain continuity | Unit: next seqno / agreeOnHead |
| T6 | AT signing-key rotation | Unit: old proof fails vs new DID doc; re-proven head valid |
| T7 | Revocation by record deletion | Unit: empty store + empty slice → `proof-missing` / no binding |
| T8 | Compromised Nostr key | Unit: plane-scoped revoke re-attest path |
| T9 | Compromised agent process | Unit + Gherkin: scope/rate-limit/NIP-98 |
| T10 | Malicious index | Unit: index cannot invent pairs; pure verify offline |
| T11 | DID unresolvable | Unit: `did-unresolvable` |
| T12 | Equivocation / observation history | Unit: pinning rejects lower heads |

One-to-many addresses (one Nostr→two DIDs; one DID→two Nostr) also covered in unit tests.
## Standalone verifier

```bash
npm run build -w @epoch/identity-bridge
node packages/Epoch.Identity.Bridge/scripts/verify-standalone.mjs --fixture packages/Epoch.Identity.Bridge/test-vectors/valid-binding.json
```

Integration fixture notes: [test/integration/identity-bridge/README.md](../test/integration/identity-bridge/README.md).

## Non-goals

Content bridging; ActivityPub/Farcaster; NIP-26; FROSTR implementation (interface-ready only); default DID `alsoKnownAs` mirroring; Core `CryptoSpec` changes.

## Frontier Principal Authority

`@epoch/identity` complements this bridge with stable
human/agent/service/device/organization principals, public-key bindings,
attenuated grants, finite budgets, CAS reservations, and idempotent receipts.
Grant constraints cover action, resource, repository, Community object/path,
View, Change, Change Graph, tool, model, provider, audience, expiry, depth, and budget.

This does not merge or derive the Epoch, Nostr, and AT identifiers. Provider
calls require an applicable grant, reservation, disclosure, and output bound;
their results are non-authoritative proposals. Telemetry retains permitted
digests and metadata, not private prompts or credentials. The shipped ledger is
in memory, so production authority requires an injected durable transactional
store. See [ADR-0034](design-decisions/0034-agent-principals-grants-and-budgets.md).

## References

NIP-01, NIP-46, NIP-98, NIP-65; ATProto repo/sync + `getRecord`; ATProto OAuth permission sets; did:plc; did:web; did:nostr (optional projection).
