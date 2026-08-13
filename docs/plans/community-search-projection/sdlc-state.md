# Community search and projection SDLC state

- Phase: closed
- Starting SHA: `0a41f100c45f362b7db45576c135f97507846b31`
- Ending committed SHA: `1ab821c5b47224c1656d8224042e6ed8ce99ff12`
- Land branch: `sdlc/community-search-projection-land`
- PR: [#134](https://github.com/Tyler-R-Kendrick/epoch/pull/134) squash-merged as `1ab821c`
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
- Live namespace runtimes include only builtin/community mounts plus the caller's own, and only readable projection definitions.

## Adversarial and YAGNI record

- Rejected path-derived identity, offset cursors, duplicate browser evaluators, arbitrary SQL/regex/scripts, default AI, Tantivy, and speculative network adapters.
- Reuse the owned parser, object identity, action registry, saved-projection migration, GraphQL runtime, and Nightboard composition before adding code.
- New dependencies are limited to the mandated portable GraphQL runtime and measured browser-only search/index implementations.

## Delivery layers

1. `sdlc/community-search-projection-01-foundations` — Core entity/query/search/projection/source semantics and tests.
2. `sdlc/community-search-projection-02-services` — canonical store, migrations, GraphQL, API and source adapters.
3. `sdlc/community-search-projection-03-experiences` — browser backends/workers, Nightboard workbenches, CLI, actions, generated runtimes and Pact.
4. `sdlc/community-search-projection-04-evidence` — conformance, privacy/fuzz/performance, feature journeys, docs, dependency review and final evidence.

Landed as a single delivery PR after rebase onto trunk ADR-0040/0041; search ADR is ADR-0042.

## 2026-08-13 closeout

- `createCommunityApiHost` wires store, search, projection, namespace, and GraphQL. An unconfigured handler fails closed.
- Cursor tamper checks flip a used base64 character so AES-GCM rejection is deterministic.
- Projection previews use a URL-safe id. Namespace mutations go through the live runtime.
- Live runtimes isolate private projections and user/session mounts per actor.
- REST search rejects an unsupported `scope` instead of ignoring it.
- Quality Gates on `2cbefd4` (Test, Coverage, Nightboard, Pact, A11y) were green before squash-merge.
- Unrelated local untracked files (`.impeccable/`, `.serena/`, `.cursor/`) were excluded from the delivery commit.
