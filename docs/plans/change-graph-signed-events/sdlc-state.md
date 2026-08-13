# Change Graph Signed Events — SDLC State

## Baseline

- Observed research baseline: `698e54e31dd185438f3fc9591d75352f621e67a4`
- Checkout HEAD at coordinator start: `d9d1c2ec67efb638daa5a1a4c44e09dda9fb15a0`
- Implementation worktree starts from `origin/main`: `0a41f100c45f362b7db45576c135f97507846b31`
- Working branch: `sdlc/change-graph-signed-store-01`
- Dirty community-search work in the original checkout is preserved and not edited.

## Phase

Closed — [PR #122](https://github.com/Tyler-R-Kendrick/epoch/pull/122) squash-merged
to `main` as `a809586f792cbc38676c8a9e366a8a2611c2a183` on 2026-08-12.

Change Graph CLI commands persist signed Epoch events. Local clone/fetch,
HTTP gossip, Git ingest, hydrate, mirror definitions, budget allocation,
deterministic untrusted AI conflict proposals, `split.accepted`, and live
Save Code Now archival (`EPOCH_SWH_SAVE_URL`) are implemented.

## Verification

- Focused store/CLI/git/nomenclature tests passed
- Full `npm run test:unit:runtime` passed
- `npm run gate:fast` passed
- Workspace typecheck passed
- Quality Gates, Coverage, Pact, Community Web, A11y, and Vercel passed on #122
- CodeRabbit stayed rate-limited / non-blocking

## Authority decisions

- Preserve nomenclature from #118 (`change-graph`, `review-bundle`, no `stack`/`weave`/`legacy` IDs).
- Signed events are authoritative. Local operation DAG remains local undo/recovery.
- Do not expand `core.ts`; add `change-graph-store.ts`.
- Forge codecs already exist; CLI should call them instead of returning unsupported-capability.
