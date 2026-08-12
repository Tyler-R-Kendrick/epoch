# Change Graph Signed Events — SDLC State

## Baseline

- Observed research baseline: `698e54e31dd185438f3fc9591d75352f621e67a4`
- Checkout HEAD at coordinator start: `d9d1c2ec67efb638daa5a1a4c44e09dda9fb15a0`
- Implementation worktree starts from `origin/main`: `0a41f100c45f362b7db45576c135f97507846b31`
- Working branch: `sdlc/change-graph-signed-store-01`
- Dirty community-search work in the original checkout is preserved and not edited.

## Phase

Closing fail-closed remotes — branch `sdlc/change-graph-close-failclosed`
from `7c5621f`. Isolated worktree `/tmp/epoch-change-graph-signed`.
Dirty community-search work in the original checkout is still preserved.

Change Graph CLI commands persist signed Epoch events. Local clone/fetch,
HTTP gossip, Git ingest, hydrate, mirror definitions, budget allocation,
deterministic untrusted AI conflict proposals, `split.accepted`, and live
Save Code Now archival (`EPOCH_SWH_SAVE_URL`) are implemented.

## Verification

- Focused store/CLI/nomenclature/transaction/protocol tests passed
- Full `npm run test:unit:runtime` passed
- `features/cli_wasm.feature` 5/5 scenarios passed, including signed Change creation
- `npm run gate:fast` passed
- Typecheck passed for `@epoch/core`, `@epoch/cli`, and `@epoch/git-proxy`

## Authority decisions

- Preserve nomenclature from #118 (`change-graph`, `review-bundle`, no `stack`/`weave`/`legacy` IDs).
- Signed events are authoritative. Local operation DAG remains local undo/recovery.
- Do not expand `core.ts`; add `change-graph-store.ts`.
- Forge codecs already exist; CLI should call them instead of returning unsupported-capability.
