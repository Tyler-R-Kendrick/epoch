# Change Graph Convergence — SDLC State

## Baseline

- Observed research baseline: `698e54e31dd185438f3fc9591d75352f621e67a4`
- Actual starting commit: `a0c427c2e731dd26cdb933c1a08785f9e4c743ee`
- Working branch: `feat/frontier-vcs-convergence`
- Newer compatible work preserved: Nightboard canonical object/projection/navigation convergence from PR 115.
- Dirty-state policy: preserve all pre-existing untracked Cursor, Impeccable, OptimizeXP, Serena, CanvasUI, and focused storage/sync test artifacts. No reset or cleanup is authorized.

## Phase

Closed — [PR #116](https://github.com/Tyler-R-Kendrick/epoch/pull/116) was
squash-merged to `main` as `0d5604888f6c8fa9b7852a3838bdb8ba9404dd46`
on 2026-08-12 after implementation, independent review, review repair, and all
local and authoritative CI gates completed successfully.

## Authority decisions

- Signed Epoch events and verified content references remain authoritative.
- Git refs, forge objects, F3 archives, social/federation records, SWHIDs, and archive receipts are projections, mappings, or evidence unless an explicit import lane says otherwise.
- `@epoch/protocol` is browser-safe and owns wire/domain schemas; Core depends on Protocol, never the reverse.
- Pre-release aliases and identifier spellings are rejected rather than maintained as compatibility APIs. New implementation belongs in cohesive modules rather than expanding `core.ts`.
- Object residency, materialization, workspace storage, and execution isolation remain distinct contracts.
- AI outputs are untrusted proposals gated by authorization, budget, disclosure, deterministic validation, and explicit acceptance.

## Swarm ownership

| Wave | Owner | Scope | Shared-file exclusions |
|---|---|---|---|
| 1A | `core_api` | Protocol schemas/IDs; Core transactions, Changes, Change Graphs, splits, Review Bundles, merges, conflicts, operations | Root manifests, lockfile, `core.ts`, central barrels, docs registries, CLI/UI |
| 1B | `nightboard_data` | Chunk store/promises/sync/workspaces; Git fidelity/protocol/quarantine; mirror foundation | Root manifests, lockfile, `core.ts`, central barrels, docs, CLI/UI |
| 1C | `a11y_evidence_docs` | Principals/grants/budgets; forge codecs; SWHID/archive; evidence/session/provider boundaries | Root manifests, lockfile, `core.ts`, central barrels, docs registries, CLI/UI |
| Conductor | `/root` | Root wiring, compatibility façades, central exports, CI/scripts, feature registration, docs, final integration/review/delivery | Does not duplicate swarm domain logic |

## Delivered waves

1. Protocol/Core Change, Change Graph, split, Review Bundle, merge, conflict, transaction, operation, storage, sync, and Workspace foundations.
2. Git, mirror, forge, identity, grant, budget, evidence, session, SWHID, and archival adapters with honest capability manifests.
3. CLI, SDK, WASM/browser inspection, revset grammar, and interop doctor.
4. Community and Operations keyboard-first surfaces with 16 persona journeys and 89 executable steps.
5. Seeded property, fuzz, compatibility, security, performance, accessibility, ADR, migration, and onboarding evidence.

## Verification evidence

- Independent review findings were repaired at the shared trust boundaries: server-derived merge authority, grant ancestry on budget use, authoritative dependency closure and review evidence, canonical CLI/revision IDs, verified NIP-34/Radicle codec evidence, truthful atomic capabilities, one SWHID parser, and event-specific JSON Schemas.
- `npm run verify` and the clean Node 22 `npm run coverage` reproduction exit 0 after those repairs.
- GitHub Actions run [`31608720542`](https://github.com/Tyler-R-Kendrick/epoch/actions/runs/31608720542) passed Build, Docs, Lint, Konsistent, Design, Typecheck, Test, Coverage, Pact, Community accessibility, and Nightboard accessibility/fault/e2e jobs; Vercel also passed.
- Coverage remained above the existing thresholds: 80.06% lines/statements, 86.63% functions, and 78.02% branches.
- Generated Protocol schemas and the Nightboard Core browser runtime both pass freshness checks.
- Existing unrelated untracked Cursor, Impeccable, OptimizeXP, Serena, and CanvasUI work remains untouched.

## Closeout

- Focused package/conformance tests, seeded fuzz smoke, compatibility fixtures, generated-schema freshness, browser/a11y validation, and the full repository verification bar passed.
- Independent review completed and its eight trust/fidelity findings were repaired; PR #116 had no unresolved review threads.
- CodeRabbit could not run because the 155-file change exceeded its 100-file plan limit; this was a tooling limitation, not a code failure, and the repository's independent review plus authoritative gates remained green.
- Closeout CI also exposed the Gossip Pact consumer running redundantly inside the unit/coverage process; it now runs only in the dedicated `test:pact` gate, while stable Community contract coverage remains in the unit runner.
- Remote `main` was verified at the squash merge SHA above. No product or migration work remains open for this initiative.

## Nomenclature hardening follow-up

- Starting commit: `d00008f02c21c76602acf497b6517fdaee548e90`
- Working branch: `feat/normalize-change-graph-language`
- Canonical language: Change, Revision, Fragment, Change Graph, Review Bundle,
  Materialization, Merge Plan, Conflict, View, Projection, Residency, Workspace,
  Sandbox, Principal, Grant, Budget, Evidence, Operation, and Code Operation.
- Removed pre-release `frontier` product branding, native `stack`, `weave`,
  `epoch:change:legacy:*`, and mutable-revision identifier compatibility.
- Added strict executable nomenclature coverage and a direct DeltaDB comparison.
- Added signed Code Operation context/query support for explicit Change, session,
  tool, and private-conversation-digest linkage. This narrows provenance gaps
  without claiming continuous editor capture or a live arbitrary-tool CRDT mount.
