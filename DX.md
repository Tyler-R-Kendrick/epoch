# DX — epoch

Standard: the **Monorepo DX Playbook** (canonical in the `HoBo` repo → `docs/standards/monorepo-dx-playbook.md`,
`https://github.com/Tyler-R-Kendrick/HoBo/blob/main/docs/standards/monorepo-dx-playbook.md`).

## Current state
TS DVCS SDK/CLI/WASM monorepo — 20 workspaces. npm (engines-only, **not pinned**), ESLint 10, `tsgo` per-package
(**no** project references/composite), Cucumber + node runner + official Pact (`npm run test:pact`) + c8 coverage. Build & typecheck are ~20-command
`&&` chains. **Native git hooks** under `.githooks/` (`prepare` → `core.hooksPath`): `pre-commit` = `gate:fast`, `pre-push` = `gate:push`.
**GitHub Actions Quality Gates are temporarily disabled** (`workflow_dispatch` only) to conserve runner minutes; re-enable `pull_request`/`push` triggers in `.github/workflows/quality.yml` when budget allows. Vercel **direct** git auto-deploy.

## Adoption checklist (leverage order)
1. 🔥 **Add Turborepo** — replace the ~20-command `&&` chains for `build` *and* `typecheck`; adds caching + `--affected`.
   Biggest build-time win. **[M]**
2. **Incremental typecheck** — project references / `composite` (or at least turbo-cache the per-package `tsgo` runs). **[M]**
3. **Pin the toolchain** (`packageManager`/`.nvmrc`); consider stepping off bleeding-edge (ESLint 10, `tsgo` dev builds)
   for reproducibility. **[S]**
4. **Native git hooks** — **done (local-first):** `gate:fast` → `pre-commit`; `gate:push` → `pre-push`. Optional later:
   turbo `--affected` to speed push gates. **[S]**
5. **CI policy** — Quality Actions **off** for now (runner minutes). When re-enabled: at most a thin backstop
   (konsistent + secret scan), `paths`-filtered + `concurrency` + `--affected`. **[M]**
6. **Shared config package** — move ESLint rules + `tsconfig.base` into one package. **[S]**

Workflow policy (playbook §8): direct-to-Vercel does **not** earn a deploy workflow; gates belong in hooks.
