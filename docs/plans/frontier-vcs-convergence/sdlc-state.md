# Frontier Version-Control Convergence — SDLC State

## Baseline

- Observed research baseline: `698e54e31dd185438f3fc9591d75352f621e67a4`
- Actual starting commit: `a0c427c2e731dd26cdb933c1a08785f9e4c743ee`
- Working branch: `feat/frontier-vcs-convergence`
- Newer compatible work preserved: Nightboard canonical object/projection/navigation convergence from PR 115.
- Dirty-state policy: preserve all pre-existing untracked Cursor, Impeccable, OptimizeXP, Serena, CanvasUI, and focused storage/sync test artifacts. No reset or cleanup is authorized.

## Phase

Implementation — wave 1 foundations.

## Authority decisions

- Signed Epoch events and verified content references remain authoritative.
- Git refs, forge objects, F3 archives, social/federation records, SWHIDs, and archive receipts are projections, mappings, or evidence unless an explicit import lane says otherwise.
- `@epoch/protocol` is browser-safe and owns wire/domain schemas; Core depends on Protocol, never the reverse.
- Existing `EpochRepository` APIs remain compatibility façades. New implementation belongs in cohesive modules rather than expanding `core.ts`.
- Object residency, materialization, workspace storage, and execution isolation remain distinct contracts.
- AI outputs are untrusted proposals gated by authorization, budget, disclosure, deterministic validation, and explicit acceptance.

## Swarm ownership

| Wave | Owner | Scope | Shared-file exclusions |
|---|---|---|---|
| 1A | `core_api` | Protocol schemas/IDs; Core transactions, changes, stacks, splits, weaves, merges, conflicts, operations | Root manifests, lockfile, `core.ts`, central barrels, docs registries, CLI/UI |
| 1B | `nightboard_data` | Chunk store/promises/sync/workspaces; Git fidelity/protocol/quarantine; mirror foundation | Root manifests, lockfile, `core.ts`, central barrels, docs, CLI/UI |
| 1C | `a11y_evidence_docs` | Principals/grants/budgets; forge codecs; SWHID/archive; evidence/session/provider boundaries | Root manifests, lockfile, `core.ts`, central barrels, docs registries, CLI/UI |
| Conductor | `/root` | Root wiring, compatibility façades, central exports, CI/scripts, feature registration, docs, final integration/review/delivery | Does not duplicate swarm domain logic |

## Queued waves

1. CLI, SDK, WASM/browser exports, revset grammar, interop doctor.
2. Community and Operations keyboard-first product surfaces with persona journeys.
3. Cross-cutting fuzz/property/chaos/compatibility/performance harnesses and threat matrix.
4. ADRs, current architecture, capability matrices, migration/onboarding, feature inventories, and competitor evidence.

## Required closeout

- Focused package and conformance tests, fuzz smoke, compatibility fixtures, generated-schema freshness.
- `npm ci`, `npm run gate:fast`, `npm run typecheck`, `npm run build`, unit/features, coverage, Pact, and `npm run verify`.
- Visual browser and accessibility validation for new Community/Operations behavior.
- Independent review, all comments resolved, CI green, squash merge, and remote main verification.
