# Testing Lanes

Epoch already had most of the lanes below. This page names them honestly so
agents do not invent a second stack or call one lane by another lane's name.

**High coverage is not uniform across every lane.** Node-visible package
coverage is held to high c8 floors (lines/statements 90, functions 87, branches
80 in `.c8rc.json`). All four global metrics are above 80%. Those floors do not
cover Playwright-only Community Web client bundles. Some individual packages
(notably Community CLI, Atproto, Identity Bridge internals, and Community Web
render branches) remain below 80% on a single metric. Mutation and
characterization are strong on listed contracts, not a whole-program Stryker or
Verify suite.

| Lane | Strength | What Epoch uses | Where it runs |
|---|---|---|---|
| Atomic unit | Strong | `node:assert` suites via `test/run-unit-tests.ts` and `packages/*/test/*.test.mjs` | `npm run test:unit:runtime`, `npm test -w @epoch/<pkg>` |
| BDD / behavior | Strong | Cucumber `features/*.feature` + `test/features/*_steps.ts` (Playwright for browser persona steps) | `npm run test:features:runtime` (`npm test`) |
| Contract | Strong (HTTP); NATS AUTH is not Pact | Official Pact for HTTP (`Community.Core`↔`Community.API`, gossip HTTP). NATS AUTH uses `test/unit/platform-fabric-nats-contract.test.ts` plus characterization goldens | `npm run test:pact`; unit runner |
| Chaos / faults | Partial | Hang, malformed JSON, revoke, concurrency (`packages/Epoch.Nats/test/chaos-auth.test.mjs`, `chaos-svc.test.mjs`); XMPP malformed fanout envelopes (`packages/Epoch.Xmpp/test/chaos-fanout.test.mjs`); Community Web `community-web:app:faults` (AI-draft path) | `npm test -w @epoch/nats`, `npm test -w @epoch/xmpp`, `npm run community-web:app:faults` |
| Fuzz | Strong on PR; Jazzer scheduled | ADR-0052: smoke, short fast-check (parsers, fabric auth, **service discovery**, history), corpus regression | `npm run fuzz:fast-check` (also inside `npm test`) |
| Mutation | Focused, not whole-program | PR-time oracles plus **source mutant kill** for NATS (`npm run mutation:nats`), XMPP (`npm run mutation:xmpp`), Protocol capability flags (`npm run mutation:protocol`), Community Web Activity terminal nav (`npm run mutation:community-web`), and session-init toolchain probing (`npm run mutation:session-init`). Full-project Stryker scoring stays out of band | Quality Gates mutant-kill jobs |
| Snapshot / characterization | Focused Verify-style goldens | Canonical JSON goldens (`test/verify/`), Node's equivalent of [VerifyTests/Verify](https://github.com/VerifyTests/Verify). Helper behavior is unit-tested (`test/unit/verify-helper.test.ts`) | unit runner; refresh `EPOCH_UPDATE_VERIFIED=1` |

## Characterization goldens

Goldens live at `test/verify/verified/<name>.verified.json`. On mismatch the
helper writes `<name>.received.json` (gitignored) and fails. Accept a new
shape only after reviewing the received file:

```bash
EPOCH_UPDATE_VERIFIED=1 npm run test:unit:runtime
```

Current goldens:

| Name | Contract |
|---|---|
| `nats-subjects` / `nats-stream-specs` | NATS subject and stream shape |
| `nats-acl-matrices` | Open vs hosted session/token ACL |
| `nats-auth-callout-allow-open` | AUTH allow payload shape |
| `posture-defaults` | Open/denied/hosted/private posture evaluation |
| `protocol-capabilities` | Frozen protocol capability manifest (providers untrusted, no canonical mutation, conservative commutation) |
| `design-token-colors` | Published `@epoch/design-tokens` color map |
| `community-web-voice-selectors` | Lounge voice tray attributes, `cn-board-stage`, blur-released PTT |
| `community-web-activity-terminal` | Activity filters are `kind: activity` terminal leaves; nav parent stays `/notifications` |
| `xmpp-fidelity` | XMPP fidelity statement (default off, XEP-0045 refused) |
| `xmpp-channel-fanout-envelope` | Conference-shaped routing label for public channel bytes |

Do not treat goldens as identity. Transport still moves bytes; clients verify
signatures.

`EPOCH_VERIFIED_DIR` redirects the golden directory for helper unit tests only.

## New work (SDLC skill policy)

For **new** user-visible work, prefer:

1. Persona-tagged Gherkin under `features/` (`@persona.*`, including agents-as-users and
   competitor power-user personas when the surface competes).
2. Playwright as the browser driver for those scenarios.
3. **Pact** at HTTP/integration boundaries instead of adding new full-stack e2e suites when
   the boundary is contractual.

Existing Community Web e2e jobs in `verify` / CI remain until a dedicated migration. Do not
add new e2e-by-default paths. See [`skills/sdlc`](../skills/sdlc/SKILL.md) (`sdlc test`).

## What is still out of band

- Full-project Stryker mutation scoring (NATS, XMPP, Protocol, and Community Web
  Activity use owned mutant-kill scripts instead)
- Jazzer.js campaigns (`npm run fuzz:jazzer`) except corpus replay on PR
- Production nats-server JWT handshake (gated; not a Production ship)
- Chaos beyond NATS auth/svc, XMPP fanout envelopes, and Community Web AI-draft
  faults (no cluster-wide fault injection)
