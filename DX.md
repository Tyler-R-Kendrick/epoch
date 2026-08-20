# DX — epoch

Standard: Epoch's local quality gates and the root `AGENTS.md` workflow.

## Current state
TS DVCS SDK/CLI/WASM monorepo — 20 workspaces. npm (engines-only, **not pinned**), ESLint 10, `tsgo` per-package
(**no** project references/composite), Cucumber + node runner + official Pact (`npm run test:pact`) + c8 coverage. Build & typecheck are ~20-command
`&&` chains. **Native git hooks** under `.githooks/` (`prepare` → `core.hooksPath`): both `pre-commit` and `pre-push` run `gate:commit` —
parallel `gate:fast` static checks plus Community Web a11y lint (CI Lint-job parity). Prefer `gate:push` before PRs when typecheck/build/unit are green.
**GitHub Actions Quality Gates run on every `pull_request` and push to `main`** (`.github/workflows/quality.yml`) — docs, lint, konsistent,
design, typecheck, test, coverage, Pact, and the Community Web/a11y suites, each its own job, behind a fail-closed guard that only runs on this
public repository's standard `ubuntu-latest` runners (see `docs/ai-automation-strategy.md` Finding 1 — those are free and unmetered for public
repos; the guard exists so a visibility flip or an org transfer fails loud instead of silently incurring billing). Vercel **direct** git
auto-deploy.

## Adoption checklist (leverage order)
1. 🔥 **Add Turborepo** — replace the ~20-command `&&` chains for `build` *and* `typecheck`; adds caching + `--affected`. Biggest build-time
   win, and now doubles as CI speedup once Quality Gates run those chains on every PR. **[M]**
2. **Incremental typecheck** — project references / `composite` (or at least turbo-cache the per-package `tsgo` runs). **[M]**
3. **Pin the toolchain** (`packageManager`/`.nvmrc`); consider stepping off bleeding-edge (ESLint 10, `tsgo` dev builds)
   for reproducibility. **[S]**
4. **Native git hooks** — **done (local-first):** `gate:commit` → `pre-commit` and `pre-push` (parallel static + a11y). Prefer `gate:push`
   before PRs. Branch protection + Actions remain authoritative for full verify. Optional later: turbo `--affected` to speed the hooks further. **[S]**
5. **CI policy** — **done:** Quality Gates run on every `pull_request`/push to `main`, one job per concern, behind the fail-closed
   public-repo/standard-runner guard above. Optional later: `paths`-filtered + `concurrency` to cut redundant runs, and `--affected` once
   Turborepo (item 1) lands. **[M]**
6. **Shared config package** — move ESLint rules + `tsconfig.base` into one package. **[S]**

Workflow policy (playbook §8): direct-to-Vercel does **not** earn a deploy workflow; gates belong in CI, with local hooks as a fast pre-flight.
