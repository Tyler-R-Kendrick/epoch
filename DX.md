# DX — epoch

Standard: the **Monorepo DX Playbook** (canonical in the `HoBo` repo → `docs/standards/monorepo-dx-playbook.md`,
`https://github.com/Tyler-R-Kendrick/HoBo/blob/main/docs/standards/monorepo-dx-playbook.md`).

## Current state
TS DVCS SDK/CLI/WASM monorepo — 20 workspaces. npm (engines-only, **not pinned**), ESLint 10, `tsgo` per-package
(**no** project references/composite), Cucumber + node runner + official Pact (`npm run test:pact`) + c8 coverage. Build & typecheck are ~20-command
`&&` chains. **No git hooks.** CI = a single `quality.yml` with **6 parallel un-cached jobs** (no concurrency, no
path/affected filtering, redundant `npm ci` + rebuild). Vercel **direct** git auto-deploy.

## Adoption checklist (leverage order)
1. 🔥 **Add Turborepo** — replace the ~20-command `&&` chains for `build` *and* `typecheck`; adds caching + `--affected`.
   Biggest build-time win. **[M]**
2. **Incremental typecheck** — project references / `composite` (or at least turbo-cache the per-package `tsgo` runs). **[M]**
3. **Pin the toolchain** (`packageManager`/`.nvmrc`); consider stepping off bleeding-edge (ESLint 10, `tsgo` dev builds)
   for reproducibility. **[S]**
4. **Native git hooks** — `verify` gate → `pre-push` (affected); fast checks → `pre-commit` (staged). Currently
   discipline-only. **[M]**
5. **Slim the CI to policy** — epoch is direct-to-Vercel, so the 6-job `quality.yml` violates the workflow rule. Move
   gates to hooks; reduce CI to **at most a thin server-side backstop** (konsistent + secret scan), `paths`-filtered +
   `concurrency` + `--affected`. *(Open question: keep a thin backstop vs. remove CI entirely.)* **[M]**
6. **Shared config package** — move ESLint rules + `tsconfig.base` into one package. **[S]**

Workflow policy (playbook §8): direct-to-Vercel does **not** earn a deploy workflow; gates belong in hooks.
