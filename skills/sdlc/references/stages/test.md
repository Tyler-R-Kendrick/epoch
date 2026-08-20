---
type: Agent Skill Reference
title: "SDLC test"
description: "Persona-constrained BDD/TDD with Gherkin, Playwright driver, and Pact boundaries."
tags: [epoch, sdlc, tdd, bdd, pact, playwright, persona]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc test`

Design and run tests that prove **persona outcomes**. Do not invent coverage for code that no
persona scenario touches.

## Flags

| Flag | Meaning |
|---|---|
| `--persona <tag>` | Focus scenarios tagged e.g. `@persona.github_open_source_contributor` |
| `--feature <path>` | Limit to one `features/*.feature` file |

## Policy (new work)

1. **Gherkin first** under `features/` with `@persona.*` tags. Personas include humans,
   **agents-as-users**, and **competitor power-user** personas when the surface competes
   (seed from [docs/evidence/competition/](../../../../docs/evidence/competition/) and
   [docs/persona-feature-matrix.md](../../../../docs/persona-feature-matrix.md)).
2. **TDD/ATDD:** failing scenario or focused unit/contract test before implementation.
3. **Playwright** drives browser-visible persona steps (step definitions), not orphan screen
   inventories.
4. **Pact** mocks integration boundaries (HTTP consumer/provider). Prefer Pact over new
   full-stack e2e when the boundary is contractual. Existing Community Web e2e suites remain
   until a dedicated migration; **do not add** new e2e-by-default paths.
5. Unit/component tests only for modules on the scenario’s call path.
6. Keep process/governance checks out of `.feature` files (AGENTS.md / inventory docs instead).

## Red → green loop

```text
persona outcome → Gherkin scenario → (Pact or unit) failing → implement → npm run gate:commit → commit
```

Commands (Epoch):

```bash
npm run gate:commit
npm run test:pact          # when touching HTTP contracts
npx cucumber-js features/<file>.feature --require 'dist/test/features/**/*.js'
# Playwright persona/browser evidence: see stages/evidence.md
```

## Done for `sdlc test`

- Scenarios for the named personas pass.
- Pact contracts updated/verified when boundaries changed.
- No new orphan tests for unused components.
- Hand off to `sdlc evidence` when the feature is user-visible and complete.
