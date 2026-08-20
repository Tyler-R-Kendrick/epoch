---
type: Agent Skill Reference
title: "SDLC eval"
description: "Rubric scoring for self-improving agent loops; persist outcomes under .sdlc/evals."
tags: [epoch, sdlc, eval, rubric]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc eval`

Score a finished initiative or layer against standard rubrics. Write results to
[`.sdlc/evals/`](../../../../.sdlc/evals/) (`schema/eval.schema.json`). Feed failing dimensions into
the next `sdlc loop` backlog.

## Flags

| Flag | Meaning |
|---|---|
| `--initiative <slug>` | Initiative id (required) |
| `--layer <name>` | Optional single stack layer |

## Rubric dimensions (1–5 each)

| Dimension | 5 means |
|---|---|
| `personaOutcome` | Named personas achieve the journey without workarounds |
| `minimumSpec` | Spec/design was the minimum necessary; no orphan docs |
| `designCraft` | DESIGN.md + tokens; passes adversarial persona critique |
| `security` | Fail-closed trust paths; no secret leakage |
| `antiSlop` | Clean `lint:oxlint`; no type-evidence fabrication |
| `contracts` | Pact/boundaries covered; no unnecessary new e2e |
| `evidence` | Evidence pack exists with NL summary + replay |
| `delivery` | Incremental commits, stacked PRs, reviews between layers |
| `repoHygiene` | No path sprawl; dead paths removed; caches uncommitted; worktrees cleaned |
| `docsAccuracy` | Freshness matrix met; claims match code; `docs:check` green; no orphans |

## Procedure

1. Gather PR diffs, `.sdlc/reviews/`, evidence README, gate logs.
2. Score each dimension with a one-line justification.
3. `status: pass` only if every dimension ≥ 3 and no blocking review remains.
4. Append improvement actions (S/M size) for scores ≤ 3.
5. When actions are **agent-procedure** failures (not product bugs), feed
   [skill-evolution.md](../skill-evolution.md) (`sdlc skills --promote` / `--sleep`).
6. When actions are **doc accuracy / freshness** failures, feed
   [documentation.md](../documentation.md) (`sdlc docs --audit` / `--fix`).
7. Update `docs/plans/<slug>/sdlc-state.md` with eval pointer.

## Example

```yaml
id: eval-anti-slop-zero
initiative: anti-slop-zero
scores:
  personaOutcome: 4
  minimumSpec: 5
  designCraft: 4
  security: 4
  antiSlop: 5
  contracts: 4
  evidence: 3
  delivery: 5
  repoHygiene: 4
  docsAccuracy: 4
status: pass
actions:
  - Expand evidence README with replay commands
recordedAt: 2026-08-20T00:00:00Z
```
