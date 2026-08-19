# Epoch Quality Gates Reference

Epoch requires TDD and passing automated gates for source changes.

## Local gate commands

Run these commands from the repository root:

Use Node.js `^20.20.0` or `>=22.13.0` with npm `>=10.0.0`; these versions match the package engine declaration and the toolchain used by CI.

| Command | Required for | What it checks |
|---|---|---|
| `npm run docs:check` | Every change | Local Markdown links and docs/spec discoverability from `README.md`. |
| `npm run lint` | Every source, script, or test change | ESLint rules over TypeScript, JavaScript scripts, tests, and configuration. |
| `npm run konsistent` | Every workspace layout change | Structural conventions from `konsistent.json`: package and sample `package.json` manifests plus package `src/index.ts` entrypoints (Epoch.CLI excepted). |
| `npm run typecheck` | Every source or test change | `tsgo --noEmit` for Core, CLI, WASM, WASM React, Platform Web, Community API, Community Core, Community CLI, Community Web, and tests. |
| `npm test` | Every behavior change | Unit/component runtime tests plus Cucumber features against compiled TypeScript output. |
| `npm run coverage` | Every behavior change | c8 coverage over unit/component tests and Cucumber features with enforced thresholds. |
| `npm run verify` | Before review | Docs check, lint, typecheck, konsistent, tests, and coverage in sequence. |
| `npm run change-graph:fuzz-smoke` | Change Graph / protocol parser changes | Deterministic seeded smoke (not coverage-guided). |
| `npm run fuzz:fast-check` | Change Graph / parser property changes | Short fast-check + history command model with shrinking. |
| `npm run fuzz:regression` | Corpus or oracle changes | Replay versioned `test/fuzz/corpus/v1` entries. |
| `npm run fuzz:jazzer:regression` | Scheduled campaign / local parser work | Jazzer.js corpus mode. Kept out of `test:runtime` so libFuzzer cannot rewrite c8 maps. |
| `npm run mutation:nats` | NATS ACL/discovery source changes | Applies listed mutants, rebuilds `@epoch/nats`, and fails if package tests still pass. |
| `npm run mutation:xmpp` | XMPP admission/fanout source changes | Applies listed mutants, rebuilds `@epoch/xmpp`, and fails if package tests still pass. |

Community package and experience changes must keep the Community validation
layers healthy: design-thinking and user-centric docs, persona-tagged Gherkin
scenarios for user-visible product behavior, browser scenarios driven by
Playwright, official Pact (`@pact-foundation/pact`) consumer contracts plus
provider verification for HTTP service boundaries (Community API and Gossip
HTTP; see `docs/pact-contracts.md` and `npm run test:pact`), focused unit
coverage, and c8 coverage output that includes Community API, Core, CLI, and
Web packages. Community work should name the GitHub open-source contributor
persona or an explicit alternative, while keeping process, evidence-recording,
and persona-matrix checks out of feature files. The persona feature-model unit
test rejects persona-only feature files and matrix-only persona scenarios, and
it requires every executable scenario to be recorded in the executable feature
scenario inventory.

## Documentation expectations

- Follow [Documentation Freshness](documentation.md) when design choices, features, public APIs, workflows, hooks, React surfaces, or agent guidance change.
- Keep new docs reachable from `README.md` through `docs/README.md` or another linked index.
- Update ADRs, feature docs, the executable scenario inventory, and skill references in the same change as the implementation.

## TDD expectations

- Add or update a feature scenario before implementing new externally visible behavior.
- Keep feature files readable and focused on user-observable outcomes.
- Add step definitions only when existing reusable steps cannot express the behavior.
- Add unit tests for SDK state transitions and component tests for framework rendering or subscription behavior.
- Use Playwright-backed feature steps for browser-facing behavior and assert rendered evidence such as text, bounds, or screenshots.
- Do not weaken thresholds, skip tests, or hide failing coverage.

## CI expectations

The GitHub Actions quality workflow installs dependencies with `npm ci` and runs docs check, lint, typecheck, konsistent, test, and coverage as independent required gates. Scheduled fuzz campaigns live in `.github/workflows/fuzz-campaign.yml` and are not required PR checks.
