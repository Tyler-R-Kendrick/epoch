# `.sdlc/` — machine-readable SDLC store

Tracked decision, review, eval, and state records for the [`skills/sdlc`](../skills/sdlc/SKILL.md)
coordinator. Narrative initiative notes remain under `docs/plans/<slug>/sdlc-state.md`; this
directory is the **standard persisted format** agents read/write during `sdlc` stages.

| Path | Purpose |
|---|---|
| `schema/` | JSON Schema for decisions, reviews, evals, state |
| `decisions/` | Append-only YAML decisions (persona impact, status) |
| `reviews/` | Per-PR / layer `sdlc review` outcomes |
| `evals/` | Rubric scores from `sdlc eval` |
| `skillopt/` | Reviewed SkillOpt-Sleep task files + reports ([REPORT.md](skillopt/REPORT.md)) |
| `state/current.yaml` | Pointer to the active initiative slug |

Material human-facing trade-offs still get an ADR under `docs/design-decisions/` in addition to
a decision record here.

Validate shapes against the schemas before committing. Do not store secrets.
