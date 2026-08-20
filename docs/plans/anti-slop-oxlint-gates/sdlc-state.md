# Anti-slop Oxlint + local gates — SDLC state

- Initiative: `anti-slop-oxlint-gates`
- Phase: closed
- Observed research baseline: `e40d8f7` (origin/main at session start)
- Delivery branch: `feat/anti-slop-oxlint-gates` (deleted after merge)
- PR: [#170](https://github.com/Tyler-R-Kendrick/epoch/pull/170) — squash-merged [`ed14571`](https://github.com/Tyler-R-Kendrick/epoch/commit/ed14571f907235893a8a641b82bb15e7e71a894e)

## Decisions

1. Vendor anti-slop under `tools/oxlint/anti-slop/` (ADR-0056); Effect plugin present but not registered.
2. ESLint remains; `lint:oxlint` is required in `gate:fast` / CI Lint.
3. Hooks run `gate:commit` (parallel `gate:fast` + Community Web a11y lint).
4. `gate:push` (typecheck + build + unit) stays preferred pre-PR; package + test typecheck were restored for this delivery so CI Typecheck can pass.

## Session outcomes

- Clean anti-slop oxlint baseline on the tree for the rules in force.
- Parallel `scripts/run-gate-fast.mjs`.
- Docs: `docs/anti-slop.md`, ADR-0056, AGENTS/CONTRIBUTING/DX/quality-gates/ai-automation updates.
- Typecheck debt from the baseline rewrite cleared for packages and `tsconfig.test.json`.
- Fail-closed follow-up on the same PR restored schema-2 migrations, `validateProjectionId` string checks, Live Redux flat-action payloads, TomlDateTime preservation, and `CW_VALUE` unit fixtures; Quality Gates all green on `50156f7` before squash-merge.

## Stack / PRs

- Single delivery PR [#170](https://github.com/Tyler-R-Kendrick/epoch/pull/170) (no multi-layer stack) — **merged**.
