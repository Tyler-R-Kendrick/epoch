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
     remains in Community Runtime, not in NATS).
4. Auth callout is **complementary**, not primary login: Platform / Community /
   Identity Bridge remain identity of record. NATS only gates fabric admission.
   Fail closed on callout timeout, reject, expiry, or revoke.
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
| Human session | `fabric:human` | `epoch.live.>`, `epoch.community.stream.>` | those + `epoch.platform.events.>` (subscribe-only) |
| Service API token | `live:write` / `live:read` / `platform.events:*` / `community.stream:*` | per scope map | per scope map |

Empty publish+subscribe after mapping → deny. Production validators never fill
wide fixture defaults.

### Community Web

Board `getIdentity()` (guest / claimed / atproto) is **not** a Platform session.
Fabric CONNECT requires a configured endpoint **and** a Platform-backed ticket
(or mint path). Guests stay local-only with honest status
(“realtime requires sign-in”). Fabric failure does not open session/agent chat.

### Protocol honesty

`@epoch/nats` ships Epoch-native JSON auth decisions over `NatsConnectionLike`
(`attachAuthCalloutService` on `$SYS.REQ.USER.AUTH`). Full **nats-server JWT
issuance** (issuer nkey → authorization user JWT) is an **adapter-not-done**
limitation — do not claim drop-in production callout compatibility until that
adapter exists. In-process / gated bus is the supported MVP for tests and
embedded fabrics.

### Revoke after CONNECT

Short-TTL tickets + fail-closed renew are the intended control. Existing NATS
connections may outlive revoke until TTL expiry or explicit disconnect when the
broker supports it — document that immortal CONNECT after revoke is an accepted
limitation without renew.

## Consequences

- One fabric for events, messages, and streams across Live, Platform, and
  Community.
- HA for NATS is orthogonal to repo event-log HA/DR ([`docs/HA-DR.md`](../HA-DR.md)).
- Gossip HTTP snapshot sync remains; NATS does not replace it in this decision.

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
