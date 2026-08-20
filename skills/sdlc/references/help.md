---
type: Agent Skill Reference
title: "SDLC help"
description: "Print SDLC subcommand usage, flags, and where to load deeper references."
tags: [epoch, sdlc, help, usage]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc help`

When the user invokes **`sdlc help`**, **`/sdlc help`**, **`sdlc --help`**, **`sdlc -h`**, or
asks how to use the SDLC skill / what subcommands exist, **do not start product work**. Reply
with the usage block below (adapt lightly for chat), then stop unless they pick a command.

For a single command, `sdlc help <command>` prints that row’s purpose, flags, and reference path
only.

## Usage to print

```text
SDLC — Epoch delivery coordinator (skill: skills/sdlc)

Usage:
  sdlc                 Full persona-first loop (default)
  sdlc help [command]  This help (or help for one command)
  sdlc <command> [flags]

Commands:
  loop                 Full loop → stack closeout (same as bare sdlc)
  finish, --finish     Commit, PR, review, squash-merge session work
  clean                Delete merged session branches/worktrees
  review               Security / design / architecture review between PRs
  brainstorm           Adversarial + rubber-duck idea hardening
  plan                 Plan mode + stack layer slicing
  dispatch             Subagent dispatch + handback
  test                 Persona Gherkin + Playwright + Pact
  evidence             Evidence pack + standard PR ## SDLC evidence block
  gate                 gate:commit / optional gate:push / verify
  eval                 Rubric scores → .sdlc/evals/
  skills               SkillOpt/Sleep; promote patterns; harness workflows
  docs                 Doc freshness, accuracy audit, ADRs
  init                 Mirror skill symlinks, ensure .sdlc/, install SkillOpt, probe gh stack
  help, --help, -h     Show this help

Flags (by command):
  clean     [--local] [--remote] [--worktrees] [--merged-only] [--dry-run] [--force]
  review    [--security] [--design] [--architecture]   # default: all three
  gate      [--push] [--verify]
  test      [--persona <tag>] [--feature <path>]
  evidence  --feature <slug> [--pr <n>] [--comment-only] [--dry-run]
  eval      --initiative <slug> [--layer <name>]
  skills    [--promote] [--sleep] [--opt] [--workflow] [--dry-run]
  docs      [--audit] [--fix] [--matrix] [--adr] [--dry-run]
  init      [--check]

References (progressive disclosure — load only what you need):
  help       → references/help.md (this file)
  finish     → references/finish.md
  clean      → references/stages/clean.md
  review     → references/stages/review.md
  test       → references/stages/test.md
  evidence   → references/stages/evidence.md
  gate       → references/stages/gate.md
  eval       → references/stages/eval.md
  skills     → references/skill-evolution.md
  docs       → references/documentation.md
  init       → references/stages/init.md
  brainstorm → references/brainstorm.md
  plan       → references/planning.md
  dispatch   → references/dispatch.md
  index      → references/index.md

Hard rules always on: incremental commits, stacked PRs, persona minimum, Pact for new
integration boundaries, gate:commit (no hook bypass), PR evidence, repo hygiene, docs
freshness. See SKILL.md.
```

## `help finish` (short)

`sdlc finish` / `--finish` **lands the session**: stage intentional work →
`npm run gate:commit` → commit → rebase on `origin/main` → push → open/update PR(s) →
`sdlc review` + evidence + docs → **squash-merge every session PR** (billing-red CI does
not block). It is **authorization to merge** — do not stop after opening a PR to re-ask.
Load [finish.md](finish.md) and run it to completion. Do **not** start brainstorm/plan
unless finish itself needs a tiny state/docs follow-up.

## Per-command help

| Argument | Load / summarize |
|---|---|
| `finish` | Short block above + [finish.md](finish.md) |
| `clean` | [stages/clean.md](stages/clean.md) |
| `review` | [stages/review.md](stages/review.md) |
| `test` | [stages/test.md](stages/test.md) |
| `evidence` | [stages/evidence.md](stages/evidence.md) |
| `gate` | [stages/gate.md](stages/gate.md) |
| `eval` | [stages/eval.md](stages/eval.md) |
| `skills` | [skill-evolution.md](skill-evolution.md) |
| `docs` | [documentation.md](documentation.md) |
| `init` | [stages/init.md](stages/init.md) |
| `brainstorm` | [brainstorm.md](brainstorm.md) |
| `plan` | [planning.md](planning.md) |
| `dispatch` | [dispatch.md](dispatch.md) |
| `loop` | SKILL.md default loop section |
| unknown | Say unknown; print the full usage block |

## Related

- [index.md](index.md) — full reference map
- [../SKILL.md](../SKILL.md) — router + hard rules
