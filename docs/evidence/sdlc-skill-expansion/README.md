# Evidence — SDLC skill expansion

**Personas:** n/a (agent/process skill + docs; no Community Web UI).
**Outcome:** Expanded `skills/sdlc` router with finish/help/evidence/docs/skills
stages, host symlinks, `.sdlc/` store, and SkillOpt wiring — without inventing
Epoch `pnpm agent:check` gates.

## What passed

| Check | Result |
|---|---|
| Host mirrors | `npm run skills:mirror-sdlc -- --check` — all hosts ok |
| SkillOpt CLIs | `node scripts/install-skillopt.mjs --check` — present |
| SkillOpt Sleep Night 2 | held-out evidence/hygiene score **1.0** (see `.sdlc/skillopt/REPORT.md`) |
| Docs / commit gate | `npm run docs:check` + `npm run gate:commit` on delivery branch |

## Artifacts

- Skill tree: `skills/sdlc/`
- Decisions: `.sdlc/decisions/`
- SkillOpt tasks/report: `.sdlc/skillopt/`
- State: `docs/plans/sdlc-skill-expansion/sdlc-state.md`

## Replay

```bash
npm run skills:mirror-sdlc -- --check
node scripts/install-skillopt.mjs --check
npm run docs:check
npm run gate:commit
# optional regression (needs cursor-agent + SkillOpt):
# skillopt-sleep dry-run --project "$(pwd)" \
#   --tasks-file .sdlc/skillopt/sdlc-skill-tasks.json \
#   --target-skill-path skills/sdlc/SKILL.md --backend cursor
```

## Contracts / traces

- Pact: n/a
- Playwright: n/a (no persona UI)
- Trace / video: not recorded — skill/docs-only change
