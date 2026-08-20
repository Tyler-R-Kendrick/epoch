# SkillOpt-Sleep report — `skills/sdlc`

## Setup

- Tool: Microsoft SkillOpt-Sleep (installed from `git+https://github.com/microsoft/SkillOpt.git` via `uv tool`)
- Backend: `cursor` (`cursor-agent`)
- Tasks: [`sdlc-skill-tasks.json`](sdlc-skill-tasks.json) (`reviewed: true`)
- Target: `skills/sdlc/SKILL.md`

## Night 1 — dry-run (pre-fix)

- Baseline (mixed): **0.667**
- Gate: `reject` / accepted=false
- Finding: held-out evidence task failed — answers mentioned `## SDLC evidence` but omitted `docs/evidence`
- Train tasks all passed → reflect returned **0 edits**

## Bounded skill edit (SkillOpt-informed)

Hard rule 9 in `SKILL.md` now requires the pack under `docs/evidence/<slug>/`, the
`## SDLC evidence` PR body + sticky comment, and calls out that omitting the path is incomplete.

## Night 2 — run (post-fix)

- Held-out score: **1.000 → 1.000** (evidence + hygiene)
- Gate: `reject` / accepted=false (no further improving edits — already perfect on the task set)
- Local staging: `.skillopt-sleep/staging/20260820-134235/` (gitignored)

## Night 3 — manual polish + task expansion (no full Sleep re-run)

Full Cursor-backend Sleep is expensive after a perfect held-out score. Instead:

1. Removed leftover non-Epoch gate language (`pnpm`/`draft:cascade` invention) from cascade/planning.
2. Hardened `help finish` + finish mode table (authorization to squash-merge).
3. Added SkillOpt tasks: `sdlc-finish-authorizes-merge`, `sdlc-epoch-gate-not-pnpm`.
4. Decision: `.sdlc/decisions/2026-08-20-sdlc-skill-polish.yaml`.

## Adoption

Did **not** run `skillopt-sleep adopt` (no useful staged skill delta). The measured improvement
is the hard-rule 9 clarification already in the tracked skill. Keep the task file for regression
re-runs:

```bash
skillopt-sleep dry-run \
  --project "$(pwd)" \
  --tasks-file .sdlc/skillopt/sdlc-skill-tasks.json \
  --target-skill-path skills/sdlc/SKILL.md \
  --backend cursor \
  --progress
```
