---
name: pact
description: >
  Official Pact consumer-driven contract testing for Epoch service boundaries.
  Use when writing or verifying Pact contracts, HTTP client/provider integration
  tests, gossip/Community API contracts, or when the user says "pact", "contract
  test", "consumer driven contract", "CDC", "provider verification", or
  /pact. Follows https://docs.pact.io/ and @pact-foundation/pact (PactV3 + Verifier).
---

# Pact Contract Testing (Epoch)

Use **official** Pact tooling only: `@pact-foundation/pact` (already in this repo).
Do not invent ad-hoc HTTP snapshot assertions when a service boundary exists.

## When to use Pact

Add/update a Pact **whenever** an integration boundary is HTTP (or message) based:

| Consumer | Provider | Boundary |
|---|---|---|
| `Epoch.Community.Core` HTTP client | `Epoch.Community.API` | `/workflows`, `/repositories`, issues, changes |
| `Epoch.Core` `HttpGossipPeer` | `Epoch.Core.GossipHttp` | `POST /epoch/gossip` |

**Do not** use Pact for pure in-process unit logic (CRDT merge, Ed25519 verify).
Those stay as unit tests.

## Official process ([docs.pact.io](https://docs.pact.io/))

1. **Consumer test** — real client code against Pact mock server; generates contract JSON.
2. **Share** — write contracts to durable `pacts/` (this repo) or publish to a Pact Broker.
3. **Provider verification** — `Verifier` replays requests against a **running** local provider.
4. **CI** — fail the build if consumer or provider verification fails.

## Repo layout

```text
pacts/                          # generated consumer contracts (durable)
test/pact/helpers.ts            # PactV3 factory + HTTP adapter helpers
test/pact/consumer/             # additional consumer suites
test/pact/provider/             # Verifier suites
test/unit/community-contract.test.ts
test/pact/run-pact-tests.ts     # consumer then provider
```

## Commands

```bash
npm run test:pact           # consumers → write pacts → provider verification
npm run test:pact:consumer  # consumer contracts only
npm run test:pact:provider  # provider verification (requires pacts/)
```

## Writing a consumer test (PactV3)

```ts
import { MatchersV3 } from "@pact-foundation/pact";
import { createConsumerPact, PactConsumers, PactProviders } from "../pact/helpers";
import { createHttpCommunityClient } from "@epoch/community-core"; // real client

const pact = createConsumerPact({
  consumer: PactConsumers.communityCore,
  provider: PactProviders.communityApi,
});

pact
  .given("community repositories exist")
  .uponReceiving("a request to list community repositories")
  .withRequest({ method: "GET", path: "/repositories", headers: { Accept: "application/json" } })
  .willRespondWith({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: MatchersV3.eachLike({ slug: "epoch/epoch" }, 1),
  });

await pact.executeTest(async (mockServer) => {
  const client = createHttpCommunityClient({ baseUrl: mockServer.url });
  // MUST exercise real client code, not raw fetch-only probes
  await client.listRepositories();
});
```

Rules from official docs:

- Test the **collaborating client**, not raw HTTP only.
- Use matchers (`MatchersV3.like`, `eachLike`, `regex`) for flexible fields.
- Provider state names in `given(...)` must match provider `stateHandlers`.
- Interaction `given` + `uponReceiving` pairs must be unique within a pact.

## Writing provider verification

```ts
import { Verifier } from "@pact-foundation/pact";

await new Verifier({
  provider: "Epoch.Community.API",
  providerBaseUrl: runningServer.url,
  pactUrls: ["pacts/Epoch.Community.Core-Epoch.Community.API.json"],
  stateHandlers: {
    "community repositories exist": async () => { /* seed provider */ },
  },
}).verifyProvider();
```

- Start the **real** provider (or thin adapter over real domain code).
- Stub external deps only; do not reimplement the provider inside the test.
- Prefer local `pactUrls` in unit CI; optional broker publish is CI-only.

## Adding a new service boundary

1. Name consumer + provider in `test/pact/helpers.ts` (`PactConsumers` / `PactProviders`).
2. Add consumer test under `test/pact/consumer/` (or extend unit contract suite).
3. Implement/extend HTTP provider surface if missing.
4. Add provider verification with `stateHandlers` for every `given`.
5. Wire into `test/pact/run-pact-tests.ts` and run `npm run test:pact`.
6. Update `docs/pact-contracts.md` boundary table.

## Broker (optional)

Publish only from CI when broker env is configured:

```bash
# requires @pact-foundation/pact-cli and PACT_BROKER_BASE_URL (+ token)
npx pact-broker publish ./pacts --consumer-app-version="$GIT_SHA" --broker-base-url="$PACT_BROKER_BASE_URL"
```

Do not hard-code broker secrets in the repo.

## References

- https://docs.pact.io/
- https://docs.pact.io/implementation_guides/javascript/docs/consumer
- https://docs.pact.io/getting_started/verifying_pacts
- https://github.com/pact-foundation/pact-js
- Repo guide: `docs/pact-contracts.md`
