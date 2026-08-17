# NATS Realtime Fabric

Epoch’s realtime fabric is **host `nats-server`** with JetStream and WebSocket,
plus an Epoch-owned **auth callout**. Browsers and WASM guests use **`nats.ws`**
clients — there is no production WASM NATS *server*. The decision is
[ADR-0054](design-decisions/0054-nats-realtime-fabric.md). The package is
`@epoch/nats`.

## Posture

- Transport moves bytes; Epoch clients still verify signatures (`@epoch/live`
  `ingestEvents`).
- Auth callout is **complementary**: Platform identity stays primary; callout
  only gates fabric admission. Clients present an opaque **fabric credential**
  minted by Platform Core (`mintFabricCredential`) — never a raw session or
  API-token id.
- Validators inject `verifyFabricCredential` and attach **least-privilege**
  subject ACLs (`permissionsForScopes`). Fail closed on reject / timeout /
  empty scopes / expiry / non-finite expiry / blank credentials / revoke.
- Community DM/visibility is **not** encoded in NATS claims.
- NATS HA is orthogonal to repository event-log HA/DR ([HA-DR](HA-DR.md)).

## Streams

| Stream | Subjects | Role |
|---|---|---|
| `EPOCH_LIVE` | `epoch.live.*.sync`, `epoch.live.*.presence` | Live sync/presence |
| `EPOCH_PLATFORM_EVENTS` | `epoch.platform.events.>` | Durable platform audit; cursor ↔ seq |
| `EPOCH_COMMUNITY_LIVESTREAM` | `epoch.community.stream.>` | Sanitized command envelopes (ADR-0050) |

## Scope → subject map

| Class | Scope | Publish | Subscribe |
|---|---|---|---|
| Session | `fabric:human` | `epoch.live.>`, `epoch.community.stream.>` | + `epoch.platform.events.>` (sub only) |
| API token | `live:write` | `epoch.live.>` | `epoch.live.>` |
| API token | `live:read` | — | `epoch.live.>` |
| API token | `platform.events:write` | `epoch.platform.events.>` | `epoch.platform.events.>` |
| API token | `platform.events:read` | — | `epoch.platform.events.>` |
| API token | `community.stream:write` | `epoch.community.stream.>` | `epoch.community.stream.>` |
| API token | `community.stream:read` | — | `epoch.community.stream.>` |

## Live provider

`createNatsLiveProvider(channel)` is a dumb fan-out wrapper. Authenticated
fabric access goes through `openAuthenticatedNatsLiveChannel` (gated connect +
Live subjects). Missing or invalid fabric secrets fail closed — there is no
silent anonymous `epoch.live.*` access.

```ts
import { createAuthenticatedNatsLiveProvider, createNatsLiveProvider } from "@epoch/live";
import {
  connectGatedNatsBus,
  createInMemoryNatsBus,
  openAuthenticatedNatsLiveChannel,
} from "@epoch/nats";

const shared = createInMemoryNatsBus();
// `gate` is true only after Epoch auth callout allow (Platform fabric credential).
const connect = (secret: string) =>
  connectGatedNatsBus(() => shared, gate, secret);

const opened = await openAuthenticatedNatsLiveChannel({
  repoId: "repo",
  fabricSecret,
  connect,
});
const provider = createNatsLiveProvider(opened.channel, opened.providerId);

// equivalent convenience: connect throws → no provider is returned
const authenticated = await createAuthenticatedNatsLiveProvider({
  repoId: "repo",
  fabricSecret,
  connect: (secret) => openAuthenticatedNatsLiveChannel({ repoId: "repo", fabricSecret: secret, connect }),
});
```

The ungated `createNatsLiveChannel` seam remains for tests that already hold a
permissioned connection. Dev servers use the template in `@epoch/nats`
(`NATS_SERVER_CONF_TEMPLATE`).

## Callout protocol honesty

`attachAuthCalloutService` answers Epoch-native JSON allow/deny on
`$SYS.REQ.USER.AUTH` over `NatsConnectionLike`. Full nats-server JWT issuance
(issuer nkey → user JWT) is **not done** yet — treat the in-process / gated bus
as the supported MVP until that adapter ships.

## Community Web handoff

When a fabric endpoint is configured (`window.CW_FABRIC_CONFIG`), the board
(`nats-fabric.js`) mints/presents a Platform fabric ticket for non-guest
identities that carry a Platform session/token reference. Guests do not
subscribe to broad fabric subjects and status stays honest
(“realtime requires sign-in”). See [community-web/README.md](community-web/README.md).

## Tests

| Lane | Where |
|---|---|
| Unit / package | `npm test -w @epoch/nats` (ACL, validator, gated connect, Live auth, **chaos**) |
| Platform fabric | `test/unit/platform-fabric-credentials.test.ts` |
| Cross-package contract | `test/unit/platform-fabric-nats-contract.test.ts` (mint → callout → Live) |
| Adversarial / mutation-style | `test/unit/fabric-auth-adversarial-mutation.test.ts` (guards that fail if wide defaults / id-as-secret return) |
| Property / fuzz (PR) | `test/fuzz/properties/fabric-auth.fast-check.test.ts` via `npm run fuzz:fast-check` |
| Community handoff | `packages/Epoch.Community.Web/test/nats-fabric.test.mjs` |
| Community e2e | `FABRIC-001` / `FABRIC-002` in `packages/Epoch.Community.Web/test/e2e.mjs` |
| Product Gherkin | `features/community_web_experience.feature` guest honesty + ticketed attach |

HTTP [Pact](pact-contracts.md) does not cover NATS AUTH JSON; the contract test
above is the Epoch-native seam. Full Stryker-style mutation tooling is still
out of band; adversarial oracles + chaos cover the high-risk mutants for this
path. Immortal CONNECT after revoke without renew remains an accepted broker
limitation — renew/callout is fail-closed.
