---
type: Agent Skill Reference
title: "SDLC init"
description: "Ensure skill host symlinks, .sdlc store, and gh stack readiness."
tags: [epoch, sdlc, init]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc init`

## Flags

| Flag | Meaning |
|---|---|
| `--check` | Verify mirrors + SkillOpt CLIs only (no writes) |

## Steps

```bash
npm run skills:mirror-sdlc
# or: node scripts/mirror-sdlc-skill.mjs [--check]

# Once per machine (idempotent): Microsoft SkillOpt CLIs
node scripts/install-skillopt.mjs
# provides: skillopt-sleep, skillopt-train, skillopt-eval

test -d .sdlc/schema
gh stack --help
git config --local rerere.enabled true
git config --local remote.pushDefault origin
```

With `--check`:

```bash
npm run skills:mirror-sdlc -- --check
node scripts/install-skillopt.mjs --check
```

Ensure tracked layout exists (do not invent alternate decision stores):

- `.sdlc/README.md`, `.sdlc/schema/*.json`
- `.sdlc/decisions/`, `.sdlc/reviews/`, `.sdlc/evals/`, `.sdlc/state/`

If `.sdlc/state/current.yaml` is missing, create a stub pointing at `null` initiative.

Hosts that must symlink to `skills/sdlc`: `.agents/skills`, `.claude/skills`, `.grok/skills`,
`.cursor/skills`.

SkillOpt is **required** for `sdlc skills --sleep` / `--opt`. If install fails (no `uv`/pip),
report the blocker; do not silently skip when the user asked for skill optimization.
