# ADR-0055: Trust Posture Modes And Federation Topology

Status: Proposed

Index title: "Trust posture modes (hosted / private / open-default) with XMPP s2s inter-node transport, intra-community NATS, ADR-0023 identity authority, and gated experimental acceptance."

## Context

deployment plurality is required (centralized hosting, private
communities, and an open public fully-federated default). XMPP s2s
authenticates server identity only (XEP-0178 SASL EXTERNAL; XEP-0220
dialback legacy fallback). NATS federation shares a single Operator trust
root and has no cross-operator primitive. ATProto is public-by-default.
Unmanaged identity fragmentation is the documented multi-protocol failure
mode. The existing invariant — transport moves bytes, clients verify
signatures — makes untrusted relays safe provided admission is never
treated as authenticity.

## Decision

(1) TrustPosture = hosted | private | open as a
first-class per-community deployment property, open the default for the
general community, generalizing the ATProto disabled/local-only/federated
pattern. (2) Per-posture topology: gossip authoritative in all postures;
NATS full-fabric in hosted/private, intra-community-only in open; XMPP s2s
optional-internal in hosted, closed ring in private, open s2s with
allowlist capability in open; ATProto public dual-write in hosted/open and
blocked for non-public data in private; Nostr attestation in all postures;
identity authority = ADR-0023 bindings + Ed25519 principals in all
postures. (3) Invariants I-1..I-7 as in §2 of this brief. (4) Native
channels/presence/read-state over the signed log and the sanitized
livestream close the Discord-shaped gap; Matrix is not imported. (5)
Acceptance is experimental: the E01–E16 gated registry, default verdict
rejected, standing "Production ship: (none yet)" row, rejected-protocol
ledger.

### Topology

| Plane | hosted | private | open (default) |
|---|---|---|---|
| Gossip signed events | authoritative | authoritative | authoritative |
| NATS | full fabric, intra-community | full fabric, intra-community | intra-community only |
| XMPP s2s | optional-internal | closed ring | allowlisted s2s |
| ATProto | public dual-write | blocked for non-public | public dual-write |
| Nostr | attestation | attestation | attestation |
| Identity | ADR-0023 bindings + Ed25519 | ADR-0023 bindings + Ed25519 | ADR-0023 bindings + Ed25519 |

NATS never crosses operators. Subjects stay `epoch.live.>`,
`epoch.community.stream.>`, `epoch.platform.events.>`.

### Invariants I-1..I-7

| ID | Invariant | Test expectation |
|---|---|---|
| I-1 | Transport is never authority. JIDs, fabric credentials, and relay admission prove delivery/admission only. | Forged transport-level identity claims are rejected by clients; tests must demonstrate this. |
| I-2 | NATS is intra-community. Never design cross-operator NATS trust. | No code path crosses operator boundaries via NATS; grep-auditable. |
| I-3 | Callout ACLs scoped per source server. XMPP server A's assertions must not mint authority over server B's subjects. High-stakes actions require ADR-0023 bindings, not JID assertions. | Destructive test: assertion from server A targeting B's subject is denied. |
| I-4 | Fail closed: callout timeout/reject/expiry/revoke, unknown posture, unverifiable binding → deny. | Each failure mode has an explicit deny test. |
| I-5 | Exit from every posture: signed history export, identity continuity via bindings, community migration. | Export → verify → re-import on a fresh node reproduces identical verified history. |
| I-6 | Consent-first bridging: opt-in, public-content-only, published fidelity statement, no third-party credential custody. | Bridge refuses non-public content; opt-out removes projection without touching canonical state. |
| I-7 | Private data never federates. PrivatePublishError semantics extend to XMPP s2s and all future transports. | Attempting to federate private visibility throws/fails closed on every transport. |

### Experimental acceptance

Gates E01–E16 default **rejected**. E11 and E12 are **pending** (MLS
placeholder; no labeler fixture). Standing production row:
**Production ship: (none yet)**. See
[protocol experiments](../protocol-experiments.md).

Honest phrasing only: “Epoch-native with optional bridges.” No
“XMPP-compatible” / “Matrix-compatible.”

## Consequences

open default inherits spam/moderation costs from day one
(E06/E08 are pre-launch gates); XMPP is a loss-declared dumb transport
adapter, never an identity or consistency plane; hosted/private may use
NATS service discovery while open treats relays as replaceable; constrains
ADR-0054 (callout scoping, I-3) and ADR-0025 (server-tracked read state
becomes posture-gated); constrained by ADR-0022 and ADR-0023. Revisit when
MLS group E2EE is designed, a second independent operator joins the open
posture, or an E-series gate falsifies a load-bearing assumption.

Gated surfaces (real PDS, XMPP s2s, production nats-server JWT handshake)
default **off**. Unknown or malformed posture denies gated capabilities.
A config that claims `open` cannot enable service discovery.

### Adversarial design critique (Community Web posture badge)

Personas (GitHub open-source contributor, platform operator) reviewed the
board masthead badge (`.cw-posture`).

- Pass: honest copy (`open` / `hosted` / `private` / `denied`); token-colored
  glow using `--cw-agent` / `--cw-signed` / `--cw-ink`; uppercase mono
  tracking matches the Tron/tmux masthead; unknown config does not claim
  a valid open evaluation.
- Pass: no trust theater — extras-off is visible in the title; live mode
  still must not use `sig:local-only`.
- Fail cleared: a silent fallback of unknown posture to `open` would have
  been trust theater; the badge now labels `denied` when the configured
  posture is malformed.

Automatic-fail conditions (lifeless styling, missing craft, DESIGN.md drift)
are clear for this chrome chip. Screenshots were not regenerated in this
pass; the DOM contract is `data-posture-badge` plus `aria-label`.
