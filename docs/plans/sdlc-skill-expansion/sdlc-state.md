# SDLC skill expansion — state

- Initiative: `sdlc-skill-expansion`
- Phase: closed
- Delivery branch: `feat/sdlc-skill-expansion` (deleted after merge)
- Stack: single-layer (no `gh stack`)
- PR: [#176](https://github.com/Tyler-R-Kendrick/epoch/pull/176)

## Decisions

1. Canonical skill tree is tracked `skills/sdlc/`; host paths symlink via `npm run skills:mirror-sdlc`.
2. Subcommand router: `help`, `loop`, `finish`, `clean`, `review`, `brainstorm`, `plan`, `dispatch`, `test`, `evidence`, `gate`, `eval`, `skills`, `docs`, `init`.
3. Machine store under `.sdlc/` (schemas + decisions/reviews/evals/state).
4. Microsoft SkillOpt install is once-on-`sdlc init` via `node scripts/install-skillopt.mjs` — **no** standing npm install script.
5. Epoch gates are `npm run gate:commit` — never instruct `pnpm agent:check`.
6. Evidence hard rule: pack under `docs/evidence/<slug>/` + PR `## SDLC evidence` body + sticky comment.
7. SkillOpt Night 1–2: evidence wording fix; held-out score 1.0; no adopt (empty edits). Night 3: manual polish (cascade/gate wording, finish help, finish/gate SkillOpt tasks).

## Session outcomes

- Expanded SDLC skill + stage refs; docs policy updates; mirror + SkillOpt install scripts.
- SkillOpt task set + REPORT under `.sdlc/skillopt/`.
- Evidence pack: `docs/evidence/sdlc-skill-expansion/` (process/docs — no persona UI).
- Quality Gates: all 18 check-runs success on PR head before squash-merge.

## Stack / PRs

- Single delivery PR [#176](https://github.com/Tyler-R-Kendrick/epoch/pull/176) — squash-merged [`a4a4277`](https://github.com/Tyler-R-Kendrick/epoch/commit/a4a427703bf305604686f80209a134d007303665).
