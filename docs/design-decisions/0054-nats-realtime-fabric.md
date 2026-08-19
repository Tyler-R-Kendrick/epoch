# ADR-0054: NATS As Epoch Realtime Fabric

Status: Accepted

## Context

Epoch Live ([ADR-0019](0019-epoch-live-browser-state-and-propagation.md),
[`docs/epoch-live-spec.md`](../epoch-live-spec.md)) requires dumb relays:
transport moves bytes; clients verify signatures. Platform events are an
in-memory cursor stream; Community livestreams are sanitized command envelopes
([ADR-0050](0050-command-livestream-privacy.md)). There was no NATS usage.

A production **NATS server does not ship as browser WASM**. Browser and WASM
guests connect with **`nats.ws`** (or Node transports) to a host `nats-server`.

## Decision

1. Ship **`@epoch/nats`** with:
   - `nats.conf` template (JetStream, WebSocket, auth callout);
   - Auth callout that verifies **opaque Platform fabric credentials** (not
     session/API-token ids) and maps scopes to least-privilege subject ACLs;
   - Subject and stream constants for live, platform events, and community
     livestream;
   - An injectable connection seam plus gated in-memory bus for tests without
     a live broker.
2. Add **`createNatsLiveProvider`** on `@epoch/live`: subjects
   `epoch.live.<repo>.sync` and `epoch.live.<repo>.presence`. The provider is a
   dumb fan-out; `ingestEvents` still verifies. Authenticated fabric access uses
   `@epoch/nats` `openAuthenticatedNatsLiveChannel` over a gated connect;
   missing or invalid credentials fail closed.
3. JetStream streams (initial):
   - `EPOCH_LIVE` — live sync/presence (limits retention);
   - `EPOCH_PLATFORM_EVENTS` — durable platform audit; cursor ↔ stream seq;
   - `EPOCH_COMMUNITY_LIVESTREAM` — sanitized command envelopes (privacy policy
     remains in Community Runtime, not in NATS);
   - `EPOCH_SVC` — intra-community advertise/lookup on `epoch.svc.>` (hosted/private
     only; advertisements are admission hints, not identity).
4. Auth callout is **complementary**, not primary login: Platform / Community /
   Identity Bridge remain identity of record. NATS only gates fabric admission.
   Fail closed on callout timeout, reject, expiry, or revoke. Callout answers
   Epoch-native JSON on `$SYS.REQ.USER.AUTH` (`attachAuthCalloutService`).
5. WASM capability guests ([ADR-0045](0045-sandboxed-capability-providers.md))
   do **not** embed a NATS server; network stays host-owned.

## Complementary auth (normative)

```text
Platform session / API token
        → mintFabricCredential (opaque secret; store hash only; TTL)
        → NATS CONNECT presents secret
        → Epoch callout validator (injected verify + scoped ACL)
        → allow/deny + subject permissions
        → Live / Community streams
        → ingestEvents still verifies signatures
```

### Credential mint

- `ApiToken.id` / `PlatformSession.id` are lookup keys, **not** CONNECT secrets.
- Platform Core mints `fabricCredential`: random secret shown once, hash stored,
  bound to parent session or API token, TTL (default 1h), revoked with parent.
- `verifyFabricCredential(secret)` fails closed on unknown / revoked / expired /
  parent-revoked.

### Scope → subject ACL

| Credential class | Scopes | Publish | Subscribe |
|---|---|---|---|
| Human session | `fabric:human` | `epoch.live.>`, `epoch.community.stream.>` (+ `epoch.svc.>` when posture allows discovery) | those + `epoch.platform.events.>` (subscribe-only) |
| Service API token | `live:write` / `live:read` / `platform.events:*` / `community.stream:*` / `svc:discover` | per scope map; `svc:discover` only when posture allows | per scope map |

Empty publish+subscribe after mapping → deny. Production validators never fill
wide fixture defaults.

### Community Web

Board `getIdentity()` (guest / claimed / atproto) is **not** a Platform session.
Fabric CONNECT requires a configured endpoint **and** a Platform-backed ticket
(or mint path). Guests stay local-only with honest status
(“realtime requires sign-in”). Fabric failure does not open session/agent chat.

### Protocol honesty

`@epoch/nats` ships Epoch-native JSON auth decisions over `NatsConnectionLike`
(`attachAuthCalloutService` on `$SYS.REQ.USER.AUTH`) **and** host-side JWT
issuance (`issueUserJwt` / `verifyUserJwt`, `alg: ed25519-nkey`). Mixed-mode
callout + resolver accounts stay intra-community. Do not claim drop-in
production nats-server JWT handshake compatibility until that job is a
Production ship; the in-process / gated bus remains the supported MVP for
tests. See [ADR-0055](0055-trust-posture-modes-and-federation-topology.md).

### Revoke after CONNECT

Short-TTL user JWTs plus `createConnectionFencer` disconnect/kick on revoke
sever *tracked* connections within a bounded interval. Connections that never
enrolled in the fencer can still outlive revoke until TTL — that remaining
immortal-CONNECT gap is documented, not claimed closed.

## Consequences

- One fabric for events, messages, and streams across Live, Platform, and
  Community.
- HA for NATS is orthogonal to repo event-log HA/DR ([`docs/HA-DR.md`](../HA-DR.md)).
- Gossip HTTP snapshot sync remains; NATS does not replace it in this decision.
- JWT issuance exists; `sourceServer` scopes ACLs (I-3). Revoke fencing exists
  for tracked connections. Cross-operator NATS remains forbidden (I-2).
  Intra-community service discovery (`createInMemoryServiceDirectory`,
  `epoch.svc.>`) is posture-gated: hosted/private may advertise Live /
  livestream / platform-event endpoints; open never receives `epoch.svc.>`
  grants even if `svc:discover` is listed.

## Rejected alternatives

- Compiling `nats-server` to browser WASM — not production-ready.
- Making NATS authoritative for Epoch signatures or livestream privacy.
- Folding the broker into ADR-0045 sandboxed providers (those forbid network).
- **Callout-as-SSO / replacing `openSession` / AT OAuth** — breaks local-first
  and multi-surface identity.
- Encoding Community DM/visibility into NATS JWTs — product ACL stays in
  Community Core (`canReadCommunityResource`).
- Using Platform session/token **ids** as CONNECT secrets without minting an
  opaque fabric ticket.
