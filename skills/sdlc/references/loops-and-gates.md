---
type: Agent Skill Reference
title: "SDLC loops and gates"
description: "Red/green inner loop and narrow-then-wide outer loop with persona, Pact, and gate:commit lanes."
tags: [epoch, sdlc, tdd, gates, pact, persona]
timestamp: 2026-08-20T00:00:00Z
---

# Loops & gates

## Inner loop (one package, minutes)

Strict red/green (compose with `sdlc test`):

1. **Red:** failing test FIRST from the persona acceptance checklist —
   unit (`test/`), **Pact** contract tests, Gherkin `features/` (ATDD), benches when perf-critical.
2. **Green:** smallest change that passes. Typecheck / Pact failures are design feedback.
3. **Refactor** with tests green.
4. Package / focused cucumber or unit commands — avoid monorepo-wide sweeps as diagnostics.

## Outer loop (branch, hours)

- Before every commit: **`npm run gate:commit`** (hooks enforce this). Never bypass hooks.
- **Incremental checkins** after each red→green step.
- Whole-branch confidence at PR time; CI Quality Gates are the Done arbiter.
- Multi-layer work: `gh stack sync` / rebase after lower-layer commits; **`sdlc review`** before
  merging each PR.
- Billing-budget CI exceptions: see `stacked-prs.md` / `finish.md`.

## Required lanes (first-class)

- **Persona feature tests** — cucumber `features/*.feature` with `@persona.*` (Playwright for
  browser steps). See `stages/test.md` and `persona-minimum.md`.
- **Contract tests** — Pact at HTTP/integration boundaries (`npm run test:pact`). Prefer Pact
  over **new** full-stack e2e when the boundary is contractual.
- **Anti-slop + design** — `lint:oxlint`, `design:lint`, `design:audit` inside `gate:commit`.
- **Evidence** — for completed user-visible features (`stages/evidence.md`).
- **Perf** — benches where latency is a persona-visible risk.

## Explicitly not the default for new work

Adding new Community Web full-stack e2e suites when Pact + persona Gherkin already cover the
outcome. Existing e2e jobs remain until a dedicated migration.
