# XMPP s2s Profile

`@epoch/xmpp` is a loss-declared `FederationTransport` for inter-node bytes.
JIDs are admission only. Clients re-verify signatures. Default **off**
pending E01/E02. Honest phrase: **Epoch-native with optional bridges.**

Fidelity statement version: `XMPP_FIDELITY_STATEMENT.schemaVersion = 1`.
Channel routing: `conference-jid-labels-not-muc-occupancy`.

When the adapter is **enabled**, public `channel.create` and `channel.message`
events are encoded as `epoch.xmpp.channel-fanout/v1` envelopes and sent as
XMPP IM byte carriage (XEP-6121). The envelope's `routing.jid` looks like
`opaque@conference.dest` so s2s can fan out a room-shaped address. Clients
still re-verify Epoch signatures. Occupant JIDs never call `principalFromJid`
successfully. Private/shared visibility throws `PrivatePublishError`.
`channel.read` stays local (ADR-0025).

## Adopted

| Spec | Role |
|---|---|
| RFC/XEP-6120 | XMPP Core stream framing |
| RFC/XEP-6121 | XMPP IM stanza shape for byte carriage |
| XEP-0178 | SASL EXTERNAL (server identity) |
| XEP-0313 | MAM for inter-node archive of signed event bytes |

## Legacy reduced-trust only

| Spec | Role |
|---|---|
| XEP-0220 | Server dialback — reduced-trust admission, never full |

A dialback-only peer is admitted as reduced-trust. It cannot author
principals and cannot skip client-side signature verify.

## Refused

| Spec | Why |
|---|---|
| XEP-0045 | MUC occupancy/nicks are not Epoch chat or identity. Conference-shaped JIDs may label public channel byte routing only. |
| XEP-0071 | XHTML-IM is not a payload codec |
| XEP-0198-as-identity | Stream management is not authorship |
| XEP-0280 | Carbons are not a consistency plane |

## Posture gating (ADR-0055)

| Posture | s2s |
|---|---|
| hosted | optional-internal |
| private | closed ring |
| open | allowlisted s2s |

Unknown servers are denied. A cert for domain A cannot author domain B
principals (I-1 / I-3). Private visibility throws `PrivatePublishError` (I-7).
Opt-out disables the adapter and leaves canonical gossip state untouched (I-6).

## Tests

- In-process double: `packages/Epoch.Xmpp/test/xmpp-transport.test.mjs` and
  `test/unit/xmpp-transport.test.ts`
- CI Prosody harness: `packages/Epoch.Xmpp/test/prosody-harness.mjs` on
  `ubuntu-latest` (does not promote E01)

See [protocol experiments](protocol-experiments.md) and
[ADR-0055](design-decisions/0055-trust-posture-modes-and-federation-topology.md).
