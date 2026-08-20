# Anti-slop Oxlint + local gates — SDLC state

- Initiative: `anti-slop-oxlint-gates`
- Phase: finishing
- Observed research baseline: `e40d8f7` (origin/main at session start)
- Delivery branch: `feat/anti-slop-oxlint-gates`

## Decisions

1. Vendor anti-slop under `tools/oxlint/anti-slop/` (ADR-0056); Effect plugin present but not registered.
2. ESLint remains; `lint:oxlint` is required in `gate:fast` / CI Lint.
3. Hooks run `gate:commit` (parallel `gate:fast` + Community Web a11y lint).
4. `gate:push` (typecheck + build + unit) stays preferred pre-PR; not hook-wired until remaining anti-slop typecheck debt is cleared.

## Session outcomes

- Clean anti-slop oxlint baseline on the tree for the rules in force.
- Parallel `scripts/run-gate-fast.mjs`.
- Docs: `docs/anti-slop.md`, ADR-0056, AGENTS/CONTRIBUTING/DX/quality-gates/ai-automation updates.

## Stack / PRs

- Single delivery PR (no multi-layer stack).
