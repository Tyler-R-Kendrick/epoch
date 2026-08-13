# Community Search And Projection Evidence

This directory indexes executable and review evidence for deterministic
cross-source search, Projection Definitions, Namespace Mounts, browser indexes,
migration, privacy, performance, and Nightboard interaction.

Integrated evidence was recorded on 2026-08-12. Work started at
`0a41f100c45f362b7db45576c135f97507846b31`; swarm commits advanced the branch
to `d9d1c2ec67efb638daa5a1a4c44e09dda9fb15a0`. Final review fixes remain an
uncommitted working-tree change because this managed environment exposes Git
metadata read-only.

| Area | Executable source | Result |
|---|---|---|
| Search language, planner, reference backend, cursors, privacy | Core unit and adversarial tests | Pass: typecheck, build, focused unit tests, seeded fuzz smoke, and migration recovery. |
| Projection compiler/runtime/namespace | compiler, execution, namespace, and Nightboard navigation tests | Pass, including repeated targets, stable occurrences, recovery routes, collision order, and lazy path execution. |
| Canonical store and schema 1/2 migration | Community API persistence/migration tests | Pass; timestamps and IDs are stable and invalid definitions quarantine. |
| GraphQL schema, `@oneOf`, execution, subscriptions | `packages/Epoch.Community.GraphQL/test/` | Pass; the Nightboard host uses the portable schema rather than a duplicate implementation. |
| Reference and Orama backends | `community-search:conformance` | Pass for the supported semantic corpus. |
| SQLite WASM/FTS5 | `community-search:sqlite-runtime` | Pass against official SQLite WASM 3.53.0-build1 with real FTS5 and hostile bound values. |
| Source adapters | `community-source:conformance` and source-orchestration adversarial tests | Pass, including authorization non-interference and checkpoint regression. |
| Nightboard artifacts and non-browser parity | `nightboard:build:check`, unit parity, and focused navigation test | Pass; generated Core, GraphQL, and Worker artifacts are fresh. |
| User journeys | focused Cucumber search/projection scenarios | Pass: 15 scenarios and 61 steps. |
| Browser SQLite, a11y, faults, and e2e | Playwright/Chromium suites | Environment blocked before application execution: Chromium sandbox SIGTRAP or loopback `listen EPERM`. Not reported as pass. |
| Pact, coverage, and full `verify` | repository commands | Pact consumer + provider re-verified green on 2026-08-13. Coverage and full `verify` were not re-run as a pass claim. |
| Performance | `community-search:benchmark` | Pass for 1k and 10k corpora; 100k produced no result on this host and is not claimed. |

Machine-readable command dispositions are in
[`integration-results.json`](integration-results.json). A package pin,
compiled interface, mock, or prose scenario is never counted as browser or
backend conformance evidence.

## Evidence Boundary

The Node-hosted official SQLite test proves schema migration, FTS5 availability,
parameter binding, and Epoch translation. It does not prove Chromium Worker,
OPFS reopen, or multi-tab behavior. Those tests exist, but the managed host
cannot launch Chromium. Contract-level no-OPFS, locking, quota, cancellation,
and fallback tests pass; browser claims remain deliberately narrower.

## Adversarial Design Critique

The feature is accepted only if the final integrated Nightboard experience
passes the repository critique protocol.

| Persona | Attack | Automatic fail | Required evidence |
|---|---|---|---|
| GitHub contributor | Can I correct a query and recover a namespace in a short interrupted session? | Database-console takeover, unexplained empty result, AI called implicitly, or recovery hidden. | Keyboard journey from query error to result/explain/save, plus `/.epoch/default` recovery. |
| Maintainer | Does search reduce review load rather than create gray result mush? | Missing source completeness, unstable order, magical merge/search score, or shadowing without explanation. | Gate/source badges, exact target identity, deterministic order, namespace diff/explain. |
| Platform operator | Is browser persistence truthful and supportable? | OPFS assumed, lock/quota hidden, index called canonical, or fallback impersonating SQLite. | Capability/actual backend health, lock/fallback fault evidence, redacted diagnostics. |
| Security responder | Can unreadable data influence anything observable? | Private Entity changes a count, facet, suggestion, collision, path, explanation, or error. | Authorization non-interference corpus and GraphQL introspection tests. |
| Screen-reader power user | Do workbenches preserve focus, reading anchor, and error context? | Focus trap, queued updates move the sentence, diagnostics lack location, or collision status is visual-only. | APG interaction, live-region, focus restoration, queued update, zoom evidence. |

Current disposition: semantic and keyboard-journey evidence passes. Visual,
screen-reader, real Worker, OPFS, and multi-tab execution is blocked before
application startup by the managed host and is not a pass claim.

## Dependency And External Claim Evidence

- Exact package/license/publisher/asset review:
  [Dependency Exceptions](../../dependency-exceptions.md).
- Architecture and rejected alternatives:
  [ADR-0042](../../design-decisions/0042-deterministic-search-and-mounted-projections.md).
- DeltaDB comparison uses Zed's [DeltaDB page](https://zed.dev/deltadb) and
  [announcement](https://zed.dev/blog/introducing-deltadb), accessed
  2026-08-12. Claims are labeled early-access/product claims where no external
  protocol is published.
