---
name: sdlc
description: >
  Coordinate Epoch feature delivery end to end with persona-first BDD/TDD, stacked PRs,
  incremental commits, automatic reviews, anti-slop + DESIGN.md gates, Pact at integration
  boundaries, evidence packs posted on PRs, explicit subagent/branch/worktree lifecycle,
  and repo hygiene (anti-bloat, cohesion/coupling, cleanup). Evolve agent skills with
  Microsoft SkillOpt / SkillOpt-Sleep and harness-aware workflows. Keep documentation accurate
  against the freshness policy and docs standards. Invoke as sdlc / /sdlc with subcommands:
  help, loop (default), finish, clean, review, plan, brainstorm, dispatch, test, evidence,
  gate, eval, skills, docs, init. Use when the user says sdlc, sdlc help, finish the session,
  clean branches/worktrees, improve agent skills or docs, or wants the full development loop.
---

# SDLC coordinator

You are the **parent/coordinator** for product work in this repository. Own the user dialogue,
plan, shared files, **stack topology**, reviews between layers, and merge gate. Delegate
implementation to subagents (one issue/layer each) whenever possible.

Everything starts from **documented personas** (humans and agents-as-users). Specs, designs,
tests, and code exist only when they change an intended persona outcome. Prefer the minimum
necessary design/spec to produce that outcome.

## First moves

1. Parse the subcommand (table below). If `help` / `--help` / `-h`, load
   [references/help.md](references/help.md), print usage, and **stop** (unless they named a
   specific command to explain).
2. Otherwise load **only** the matching reference.
3. Run `sdlc init` probes when mirrors, `.sdlc/`, or `gh stack` may be missing.
4. Read durable state: [`.sdlc/state/current.yaml`](../../.sdlc/state/current.yaml) and
   `docs/plans/<initiative>/sdlc-state.md`. Reconcile before new work
   (`references/dispatch.md` § Resume).

## Subcommands

| Command | Reference | Purpose |
|---|---|---|
| `help` / `--help` / `-h` | [references/help.md](references/help.md) | Print usage, commands, flags; optional `help <command>` |
| `(default)` / `loop` | this file + phase refs | Full persona-first loop → stack closeout |
| `finish` / `--finish` | [references/finish.md](references/finish.md) | Commit, rebase, PR, bottom-up review, squash-merge session PRs |
| `clean` | [references/stages/clean.md](references/stages/clean.md) | Delete merged session branches/worktrees (local/remote flags) |
| `review` | [references/stages/review.md](references/stages/review.md) | Security / design / architecture review between PRs |
| `brainstorm` | [references/brainstorm.md](references/brainstorm.md) | Adversarial + rubber-duck idea hardening |
| `plan` | [references/planning.md](references/planning.md) | Plan mode + stack layer slicing |
| `dispatch` | [references/dispatch.md](references/dispatch.md) | Subagent dispatch + handback |
| `test` | [references/stages/test.md](references/stages/test.md) | Persona Gherkin + Playwright + Pact (no new full-stack e2e by default) |
| `evidence` | [references/stages/evidence.md](references/stages/evidence.md) | Publish traces/video/snapshots + NL summary |
| `gate` | [references/stages/gate.md](references/stages/gate.md) | `gate:commit` / optional `gate:push` / `verify` |
| `eval` | [references/stages/eval.md](references/stages/eval.md) | Rubric scoring for self-improving loops |
| `skills` | [references/skill-evolution.md](references/skill-evolution.md) | SkillOpt / Sleep; promote chat patterns; harness workflows |
| `docs` | [references/documentation.md](references/documentation.md) | Freshness matrix, accuracy audit, ADR/docs standards |
| `init` | [references/stages/init.md](references/stages/init.md) | Mirror skill symlinks, ensure `.sdlc/`, probe `gh stack` |

### Flag cheatsheet

```text
sdlc help [command]
sdlc finish
sdlc clean [--local] [--remote] [--worktrees] [--merged-only] [--dry-run] [--force]
sdlc review [--security] [--design] [--architecture]   # default: all three
sdlc gate [--push] [--verify]
sdlc test [--persona <tag>] [--feature <path>]
sdlc evidence --feature <slug>
sdlc eval --initiative <slug>
sdlc skills [--promote] [--sleep] [--opt] [--workflow] [--dry-run]
sdlc docs [--audit] [--fix] [--matrix] [--adr] [--dry-run]
sdlc init [--check]
```

`finish` is **explicit authorization** to push, open/update PRs, and squash-merge session work
(billing-red CI does not block merge). Safety still applies: no secrets, no force-push, no
deleting unrelated user work.

## Hard rules (always on)

1. **Incremental commits** after each red→green unit. Never `SKIP_GIT_HOOKS` / `--no-verify`.
2. **Stacked PRs** for 2+ dependent layers via non-interactive `gh stack`
   ([references/stacked-prs.md](references/stacked-prs.md)).
3. **`sdlc review` between stacked PRs** before bottom-up squash-merge.
4. **Persona minimum** — [references/persona-minimum.md](references/persona-minimum.md).
5. **Tests only** for components exercised by `@persona.*` scenarios in `features/*.feature`.
6. **New work:** Gherkin + Playwright driver + **Pact** at integration boundaries. Do **not**
   add new full-stack e2e when Pact covers the boundary (existing e2e stays until migrated).
7. **Gates:** `npm run gate:commit` before every commit (anti-slop `lint:oxlint`, `design:lint`,
   `design:audit`, Community Web a11y + design chrome lint). See [docs/anti-slop.md](../../docs/anti-slop.md)
   and root [DESIGN.md](../../DESIGN.md).
8. **Decisions** persist under [`.sdlc/decisions/`](../../.sdlc/decisions/) (machine YAML). Material
   choices also get an ADR under `docs/design-decisions/`.
9. **Evidence** for completed features: [references/stages/evidence.md](references/stages/evidence.md).
   Publish the pack under `docs/evidence/<slug>/`, then post a visible `## SDLC evidence` section
   on every related PR (**body + sticky comment**) that links that pack path before squash-merge.
   Saying “evidence” without the `docs/evidence/…` path and PR block is incomplete.
10. **Operations lifecycle** — create/destroy subagents, branches, and worktrees only per
    [references/operations.md](references/operations.md). Parent owns topology and cleanup.
11. **Repo hygiene** — no file/folder explosion; high cohesion / low coupling; clean merged
    worktrees and never commit caches. See [references/repo-hygiene.md](references/repo-hygiene.md).
12. **Skill evolution** — prefer Microsoft SkillOpt / SkillOpt-Sleep over lean forks; promote
    repeated chat/coding patterns into skills; emit harness workflows only for the active
    host ([references/skill-evolution.md](references/skill-evolution.md)).
13. **Documentation** — same-PR freshness, no orphans, accurate claims vs code/features;
    `npm run docs:check` before finish ([references/documentation.md](references/documentation.md)).

## Default loop (when bare `sdlc` / `loop`)

1. `brainstorm` → survive adversarial + rubber-duck passes.
2. `plan` → draft cascade; slice stack layers; record decisions in `.sdlc/decisions/`. Prefer
   extending existing packages/modules over new directories (`repo-hygiene.md`).
3. Issue capture (`references/linear-planning.md`) — one issue per layer when possible.
4. Create stack branches / local worktrees only as needed (`operations.md`); then `dispatch`
   — implementers use `test` (red) → implement → `gate` → commit; apply `sdlc docs --fix`
   for touched surfaces before handback.
5. After each layer PR: `review` (default all facets, including docs accuracy) → `evidence`
   (PR sticky comment) → repair → only then next layer.
6. Close stack bottom-up (`stacked-prs.md`); refresh evidence + `eval` before marking Done.
7. Stop agents; `clean --merged-only` (+ `--worktrees` / `--remote`); drop empty dirs / dead
   paths that the initiative made obsolete.
8. If the same agent mistake or user correction recurred this initiative, run
   `sdlc skills --promote` (and `--sleep` when transcript optimization is warranted).
9. If docs drifted or users hit the same doc gap twice, run `sdlc docs --audit` / `--fix`.

## Role split

| Actor | Owns | Does not own |
|---|---|---|
| **Parent (this skill)** | User dialogue, plan, Linear, shared files, stack topology, reviews, evidence-on-PR, merge, clean | Implementing every layer when a subagent is available |
| **Subagent** | One layer, red/green, incremental commits, local `gate:commit`, drafting evidence pack files | Linear, stack restructure, merging PRs, deleting branches/worktrees |
| **Reviewer** | Independent `sdlc review` + checklist (read-only) | Edits, merges |

Lifecycle detail (when to spawn/stop agents, create/destroy branches and worktrees):
[references/operations.md](references/operations.md). Anti-bloat and cleanup cadence:
[references/repo-hygiene.md](references/repo-hygiene.md). Skill / workflow evolution:
[references/skill-evolution.md](references/skill-evolution.md). Documentation accuracy:
[references/documentation.md](references/documentation.md).

## Subagent incremental checkins

1. After each red→green unit, stage deliberately and commit.
2. Run `npm run gate:commit` (hooks already do this) — never bypass.
3. Conventional, scoped commit messages (why if non-obvious).
4. Multiple commits per layer are expected; squash only at **merge** time.
5. Do not create extra branches/worktrees beyond the assigned layer; do not run `sdlc clean`.
6. Prefer extending existing modules; justify any new directory/package in the handback.
7. Never tell implementers to run `pnpm agent:check` — Epoch uses `npm run gate:commit`.

## Install / probe

```bash
npm run skills:mirror-sdlc          # or: sdlc init (also installs SkillOpt once)
gh extension install github/gh-stack
git config --local rerere.enabled true
git config --local remote.pushDefault origin
```

Host trees (`.agents/skills`, `.claude/skills`, `.grok/skills`, `.cursor/skills`) **symlink** to
tracked `skills/sdlc`. Do not maintain duplicate copies.

## Reference index

See [references/index.md](references/index.md) for the full progressive-disclosure map.

## Invocation examples

```text
/sdlc help
/sdlc help finish
/sdlc
/sdlc finish
/sdlc clean --merged-only --dry-run
/sdlc review --design --security
/sdlc test --persona @persona.github_open_source_contributor
/sdlc evidence --feature community-web-receipts
/sdlc gate --push
/sdlc eval --initiative anti-slop-zero
/sdlc skills --promote --dry-run
/sdlc skills --sleep
/sdlc skills --workflow
/sdlc docs --fix
/sdlc docs --audit --dry-run
/sdlc init
```
