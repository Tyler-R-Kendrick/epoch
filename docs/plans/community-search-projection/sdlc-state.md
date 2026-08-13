# Community search and projection SDLC state

- Phase: finish
- Starting SHA: `0a41f100c45f362b7db45576c135f97507846b31`
- Ending committed SHA: `d9d1c2ec67efb638daa5a1a4c44e09dda9fb15a0`
- Current branch: `sdlc/community-search-projection-01-foundations`
- Working tree: uncommitted integration/review fixes remain
- OptimizeXP run: `20260812-uxdxax-community-search-projection`
- Dispatch permission: explicit in the implementation brief

## Fixed decisions

- `CommunityObjectRef` remains canonical identity; paths and occurrences never redefine it.
- One dependency-free Core semantic model drives text, GraphQL, CLI, browser, and projection behavior.
- Search authorization precedes every observable; partial and stale sources remain explicit.
- Projection definitions are safe versioned JSON; namespace composition is deterministic and recovery paths are immutable.
- Optimized browser indexes are rebuildable candidates and must conform to the reference backend.
- The built-in namespace is a normal projection definition.
- AI may propose visible definitions but is never a search or projection execution path.

## Adversarial and YAGNI record

- Rejected path-derived identity, offset cursors, duplicate browser evaluators, arbitrary SQL/regex/scripts, default AI, Tantivy, and speculative network adapters.
- Reuse the owned parser, object identity, action registry, saved-projection migration, GraphQL runtime, and Nightboard composition before adding code.
- New dependencies are limited to the mandated portable GraphQL runtime and measured browser-only search/index implementations.

## Delivery layers

1. `sdlc/community-search-projection-01-foundations` — Core entity/query/search/projection/source semantics and tests.
2. `sdlc/community-search-projection-02-services` — canonical store, migrations, GraphQL, API and source adapters.
3. `sdlc/community-search-projection-03-experiences` — browser backends/workers, Nightboard workbenches, CLI, actions, generated runtimes and Pact.
4. `sdlc/community-search-projection-04-evidence` — conformance, privacy/fuzz/performance, feature journeys, docs, dependency review and final evidence.

## Swarm ownership

The coordinator owns root manifests, lockfile, barrels, build orchestration, generated artifacts, shared action registry, documentation indexes, integration conflict resolution, PR stack, and final gates. Implementers use isolated worktrees, write focused tests first, commit red-green units, and return a machine-readable handoff.

## 2026-08-13 integration repair

Closed remaining working-tree gaps on this branch:

- Persistence first-publish recovery stays write-path only; API hosts opt into seed persist with `persistInitial`.
- CLI help works without `EPOCH_COMMUNITY_API_URL`; mutating commands still require it.
- Skill CLI/SDK references now include Community search, projections, namespace, and `@epoch/community-graphql`.
- Nightboard `setView`, `/q`/`/view` slash aliases, and feed-query matching were restored so existing board contracts pass.
- Repository topic order is preserved for Pact; stale `changeProposals` interaction removed.

### Re-verified on this host

| Check | Result |
|---|---|
| `npm run gate:fast` | passed |
| `npm run typecheck` | passed |
| unit suite | passed |
| focused search/projection Cucumber (15 / 61) | passed |
| GraphQL package tests | passed |
| Nightboard navigation/projection test | passed |
| `nightboard:build:check` | passed |
| backend/source conformance | passed |
| adversarial search/source/SQLite runtime | passed |
| API service integration | passed |
| Pact consumer + provider | passed |

### 2026-08-13 default host

`createCommunityApiHost` now wires store, search, projection, namespace, and GraphQL. An unconfigured `createCommunityApiFetchHandler` still fails closed.

### Still open at finish

- Chromium Worker/OPFS/a11y/e2e and full `coverage`/`verify` are not claimed as pass on this host.
- Unrelated local untracked files (`.impeccable/`, `.serena/`, `.cursor/`) are excluded from the delivery commit.
