# Testing Lanes

Epoch already had most of the lanes below. This page names them honestly so
agents do not invent a second stack or call one lane by another lane's name.

| Lane | What Epoch uses | Where it runs |
|---|---|---|
| Atomic unit | `node:assert` suites via `test/run-unit-tests.ts` and `packages/*/test/*.test.mjs` | `npm run test:unit:runtime`, `npm test -w @epoch/<pkg>` |
| BDD / behavior | Cucumber `features/*.feature` + `test/features/*_steps.ts` | `npm run test:features:runtime` (`npm test`) |
| Contract | Official Pact for HTTP (`Community.Core`↔`Community.API`, gossip HTTP). NATS AUTH is **not** Pact; it is `test/unit/platform-fabric-nats-contract.test.ts` plus characterization goldens | `npm run test:pact`; unit runner |
| Chaos / faults | Hang, malformed JSON, revoke, concurrency (`packages/Epoch.Nats/test/chaos-auth.test.mjs`, `chaos-svc.test.mjs`); Community Web `community-web:app:faults` | `npm test -w @epoch/nats`, `npm run community-web:app:faults` |
| Fuzz | ADR-0052: smoke, short fast-check (parsers, fabric auth, **service discovery**, history), corpus regression. Jazzer is scheduled, not every PR | `npm run fuzz:fast-check` (also inside `npm test`) |
| Mutation | **Not Stryker.** PR-time oracles that fail if a guard is deleted (`test/unit/fabric-auth-adversarial-mutation.test.ts`, `test/unit/nats-mutation-oracles.test.ts`, adversarial I-1..I-7). Same honesty as “Jazzer is out of band” | unit runner |
| Snapshot / characterization | Verify-style canonical JSON goldens (`test/verify/`), Node's equivalent of [VerifyTests/Verify](https://github.com/VerifyTests/Verify) | unit runner; refresh `EPOCH_UPDATE_VERIFIED=1` |

Coverage floors (`.c8rc.json`) apply to Node-visible `packages/*/dist/**/*.js` after `npm run coverage`. Playwright-only Community Web client bundles are excluded on purpose.

## Characterization goldens

Goldens live at `test/verify/verified/<name>.verified.json`. On mismatch the
helper writes `<name>.received.json` (gitignored) and fails. Accept a new
shape only after reviewing the received file:

```bash
EPOCH_UPDATE_VERIFIED=1 npm run test:unit:runtime
```

Do not treat goldens as identity. Transport still moves bytes; clients verify
signatures.

## What is still out of band

- Full-project Stryker mutation scoring
- Jazzer.js campaigns (`npm run fuzz:jazzer`) except corpus replay on PR
- Production nats-server JWT handshake (gated; not a Production ship)
