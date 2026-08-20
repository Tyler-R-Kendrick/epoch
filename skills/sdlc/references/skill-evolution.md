---
type: Agent Skill Reference
title: "SDLC skill evolution"
description: "Improve agent skills with Microsoft SkillOpt / SkillOpt-Sleep; promote chat patterns into skills; generate harness-aware workflows."
tags: [epoch, sdlc, skillopt, skills, workflows, harness, agents]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc skills` — evolve agent skills & harness workflows

Teach the coordinator when to **create**, **improve**, or **optimize** agent skills, and when
to emit **harness-native workflows** (Claude, Copilot/GHCP, Grok, Cursor, Codex, …) instead of
more Markdown.

Canonical product skills stay under tracked `skills/<name>/` and are mirrored with
`npm run skills:mirror-sdlc` (and host install scripts). See [repo-hygiene.md](repo-hygiene.md)
before minting new skill trees.

## Tooling choice (locked preference)

| Option | Role | Maintenance signal (as of 2026-08) | Use in Epoch? |
|---|---|---|---|
| **[microsoft/SkillOpt](https://github.com/microsoft/SkillOpt)** | Official text-space skill optimizer + **SkillOpt-Sleep** | Primary: PyPI `skillopt`, active `main`, MS Research, harness plugins | **Yes — default** |
| SkillOpt-Lite / community “lean” forks | Thinner one-liner optimizers | Far fewer stars / slower cadence; not a drop-in for Sleep | Only if SkillOpt cannot run and user accepts weaker gates |
| Ad-hoc “lean-skillopt” renames / 0-star ports | Informal lean greedy gates | Unclear ownership | **Do not prefer** over SkillOpt |

**Default:** Microsoft SkillOpt is installed **once** by `sdlc init` (idempotent if already
present). Do not add a standing npm script for it.

```bash
# via sdlc init (preferred), or directly:
node scripts/install-skillopt.mjs          # uv tool install from microsoft/SkillOpt (git)
node scripts/install-skillopt.mjs --check  # skillopt-sleep / train / eval on PATH
skillopt-sleep --help
# Research train/eval (scored benchmarks / custom envs):
#   skillopt-train / skillopt-eval  — see https://github.com/microsoft/SkillOpt/blob/main/docs/index.md
```

`sdlc skills --sleep` / `--opt` expect these CLIs. Prefer `scripts/install-skillopt.mjs` over
ad-hoc `pip install` so the version stays pinned. Ensure `~/.local/bin` is on `PATH`
(uv tool default).

Upstream docs: [SkillOpt docs](https://github.com/microsoft/SkillOpt/blob/main/docs/index.md),
[SkillOpt-Sleep](https://github.com/microsoft/SkillOpt/blob/main/docs/sleep/README.md),
plugins under `plugins/{claude-code,codex,cursor,copilot,devin}/`.

---

## Detect the harness first

Before writing skills or workflows, detect the **current** agent harness (same spirit as
[dispatch.md](dispatch.md)):

| Signal | Harness |
|---|---|
| `CLAUDECODE` / Claude Code CLI / `.claude/` | **Claude Code** |
| `CURSOR_AGENT` / Cursor IDE agent / `.cursor/` | **Cursor** |
| `CODEX` / Codex CLI / `~/.codex/` | **Codex** |
| Grok Build / `.grok/` | **Grok** |
| GitHub Copilot Chat / Copilot CLI / `ghcp` / VS Code Copilot | **Copilot (GHCP)** |
| `CI` / headless | Prefer scripts + GitHub Actions; avoid host-only plugins |

Host skill trees and config: [optimizexp AX agents-config](../../optimizexp/references/ax/agents-config.md).

Record the harness in `docs/plans/<initiative>/sdlc-state.md` or `.sdlc/state/` notes when an
initiative includes skill evolution.

---

## When to create or improve a skill (chat / coding feedback)

Skills capture **reusable judgment + procedure**. They are not session diaries
([writing-skills](https://github.com/obra/superpowers) / Cursor create-skill patterns apply).

### Promote into a skill when **all** hold

1. The same correction, checklist, or failure mode appeared **≥2–3 times** across chats or
   coding sessions (or once with explicit user ask: “make this a skill”).
2. The content is **not** already covered by `AGENTS.md`, `DESIGN.md`, or an existing skill
   (extend the existing skill first — anti-bloat).
3. Future agents would miss it without the skill (non-obvious, repo-specific, or easy to
   rationalize away).
4. You can state a **trigger description** (when to load it) and a **verifiable done check**
   (command, rubric, or review checklist).

### Prefer editing an existing skill when

- Feedback narrows an existing procedure (`sdlc`, `gh-stack`, anti-slop, …).
- The change is a hard rule, flag, or artifact path — patch the canonical `skills/<name>/`
  and re-mirror hosts.
- Eval / review repeatedly fails the same dimension — fold the fix into that skill’s
  reference, then re-`sdlc eval`.

### Do **not** create a skill when

- One-off task (“fix this PR”) with no reuse.
- Pure product behavior — that belongs in code + `features/*.feature`, not agent skills.
- The fix is enforceable by lint/CI (`konsistent`, oxlint, docs:check) — automate; don’t
  document around the gate.
- You would duplicate host trees (use symlinks / `skills:mirror-sdlc`).

### Manual improvement loop (no optimizer yet)

1. Collect failure quotes / user corrections into a short backlog under
   `docs/plans/<slug>/` or `.sdlc/evals/` actions.
2. Write or edit `skills/<name>/SKILL.md` + progressive `references/` (keep router thin).
3. Smoke-test: invoke the skill in a fresh agent turn; confirm it loads and changes behavior.
4. Land via normal SDLC stack; update freshness docs if public agent guidance changed.

---

## When to run SkillOpt / SkillOpt-Sleep

| Situation | Tool | Notes |
|---|---|---|
| Recurring coding-agent mistakes visible in **session transcripts** | **`skillopt-sleep`** | Harvest → mine → replay → gated consolidate → **stage → human `adopt`** |
| You have a **scored task set** / benchmark for a skill | **`skillopt-train` / eval** | Treat skill Markdown as trainable state; accept edits only behind held-out gate |
| User asked to “optimize this skill” with measurable tasks | SkillOpt train | Define verifier (tests, rubric, EM); never accept ungated rewrites |
| Sensitive repo / secrets in transcripts | Sleep with inspect-first | Prefer `dry-run` / `mock` / handoff; redact; mark tasks `"reviewed": true` before real backends |
| One chat complaint, no score signal | Manual skill edit | Optimizer needs rollouts + gate — don’t fake a train run |

### SkillOpt-Sleep operator checklist (Epoch)

```bash
node scripts/install-skillopt.mjs --check || node scripts/install-skillopt.mjs
cd /path/to/epoch   # or --project

# Curated / reviewed tasks for the SDLC skill (example):
skillopt-sleep run \
  --project "$(pwd)" \
  --tasks-file .sdlc/skillopt/sdlc-skill-tasks.json \
  --target-skill-path skills/sdlc/SKILL.md \
  --backend cursor \
  --progress

# Or harvest+mine from transcripts:
skillopt-sleep dry-run --project "$(pwd)" --progress
# Inspect harvested tasks; redact secrets; then:
skillopt-sleep run --project "$(pwd)" --progress
skillopt-sleep status
# After human review of the staged proposal:
skillopt-sleep adopt
```

Latest measured SDLC optimization notes: [`.sdlc/skillopt/REPORT.md`](../../../.sdlc/skillopt/REPORT.md).

Harness plugins (install from SkillOpt repo `plugins/`, not invented here):

| Harness | Upstream plugin | Typical invoke |
|---|---|---|
| Claude Code | `plugins/claude-code` | `/skillopt-sleep` after marketplace add |
| Codex | `plugins/codex` | `install.sh` → `skillopt-sleep` skill |
| Cursor | `plugins/cursor` | `install.sh` → `/skillopt-sleep` |
| Copilot (GHCP) | `plugins/copilot` | MCP server + `--source copilot` / `--backend copilot` |
| Devin | `plugins/devin` | MCP server registration |

**Adoption rule:** Sleep **stages** proposals; the coordinator (or user) must **`adopt`**
consciously. Never auto-merge skill diffs into `skills/` without review. Adopted text that
belongs in Epoch should land as a normal PR against tracked `skills/` (+ mirror), with
`repo-hygiene` and docs freshness.

### SkillOpt train (bounded edits)

- Target model/harness stay frozen; only the skill document updates.
- Prefer small `learning_rate` (edit budget); require validation lift.
- Export `best_skill.md` → merge into canonical `SKILL.md` / references with human review.
- Re-run `sdlc eval` after adoption when the skill affects delivery quality.

---

## Skills vs workflows vs scripts

| Artifact | When to generate | Lives where |
|---|---|---|
| **Skill** (`SKILL.md`) | Judgment, procedure, progressive disclosure | `skills/<name>/` (mirrored to hosts) |
| **Host workflow** | Multi-step automation the **harness** can run without re-prompting | Harness-native path (table below) |
| **Deterministic script** | Same steps on every host / CI | `scripts/*.mjs` or skill `scripts/` — prefer this over N host copies ([deterministic-workflows](../../optimizexp/references/cross-agent/deterministic-workflows.md)) |
| **GitHub Actions** | PR/push gates, scheduled Sleep-like jobs | `.github/workflows/` — not an agent skill |

**Rule:** If the procedure must work identically under Claude, Cursor, and CI, implement a
**script** first; optionally wrap it with a thin host workflow that only invokes the script.

---

## When / how to generate harness workflows

Generate a **workflow** (not only a skill) when:

1. The loop is **mechanical** (harvest, gate, mirror, sleep schedule, multi-step verify).
2. The harness supports a native runner and the team uses that harness regularly.
3. A skill alone would rely on the model remembering a long checklist every time.

Do **not** generate workflows for every harness “for completeness” — only for harnesses in
active use (detect first). Prefer one shared script + optional thin wrappers.

### Per-harness guidance

| Harness | Native workflow / automation surface | Generate when | Shape |
|---|---|---|---|
| **Claude Code** | `.claude/` commands, hooks, plugins, scheduled Sleep | Recurring `/command` or session-end hooks; SkillOpt-Sleep install | Thin command → `skillopt-sleep` or `node scripts/…`; avoid duplicating Epoch skill body |
| **Cursor** | Rules, skills under `.cursor/skills` (symlink), Cursor plugins | Project rule for always-on policy; Sleep plugin if optimizing Cursor sessions | Symlink skills; workflow = install script + optional rule pointing at `npm run …` |
| **Codex** | Skills under `.agents/skills`, Codex config | Sleep skill install; non-interactive CLI loops | Prefer scripts + skill triggers; keep `config.toml` templates documented |
| **Grok Build** | `.grok/` **workflows** + skills | Multi-step Grok-native runs the team actually launches in Grok | Workflow YAML/steps that shell out to repo scripts; skills stay symlinked to `skills/` |
| **Copilot / GHCP** | VS Code Copilot Chat, Copilot CLI, MCP, GitHub agent tasks | Transcript harvest (`--source copilot`), cloud coding-agent dispatch | MCP registration for Sleep; cloud agents get issue contracts ([dispatch.md](dispatch.md)), not a second skill tree |
| **CI / GitHub Actions** | `.github/workflows/` | Scheduled SkillOpt-Sleep dry-run reports, verify gates | Workflow job calling `pipx run` / container + artifacts; never commit harvested secrets |

### Workflow authoring checklist

1. Detect harness → pick **one** native surface from the table.
2. Implement shared logic in `scripts/` (or SkillOpt CLI) first.
3. Add the thinnest host wrapper that invokes it with project cwd.
4. Document invoke path in the skill’s SKILL.md or `AGENTS.md` Useful commands.
5. Do not copy full skill Markdown into the workflow body.
6. After merge: `skills:mirror-sdlc` / `agents:install-skills` as needed; `docs:check`.

---

## Coordinator procedure (`sdlc skills`)

```text
sdlc skills [--opt] [--sleep] [--promote] [--workflow] [--dry-run]
```

| Flag | Meaning |
|---|---|
| `--promote` | Mine this conversation / initiative for repeated patterns; propose skill edits (manual) |
| `--sleep` | Run or instruct SkillOpt-Sleep dry-run/run for the detected harness |
| `--opt` | Plan or run SkillOpt train/eval against a scored skill task set |
| `--workflow` | Propose harness-native workflow wrappers for the detected host only |
| `--dry-run` | Print plan; change no files |

Algorithm:

1. Detect harness; refuse to invent plugins for unused hosts.
2. Inventory existing `skills/` + host mirrors; prefer patch over new skill.
3. If `--promote`: list candidate patterns (≥2 occurrences or user request); draft SKILL diffs.
4. If `--sleep` / `--opt`: follow SkillOpt upstream; stage only; adopt via PR.
5. If `--workflow`: emit wrapper for **current** harness + shared script; skip others.
6. Record decision in `.sdlc/decisions/` when adopting optimized skills repo-wide.
7. Close with `sdlc eval` actions if delivery rubrics were the trigger.

## Hard rules

1. Prefer **microsoft/SkillOpt** over lean/community forks.
2. **Never** auto-adopt Sleep/train output into `main` without review + PR.
3. Extend existing skills before creating new ones ([repo-hygiene.md](repo-hygiene.md)).
4. Product behavior → features/tests; agent procedure → skills; mechanical loops → scripts/workflows.
5. Transcript/optimizer backends may send content to providers — redact and respect secrets policy.
6. Keep host trees as **symlinks** to tracked `skills/`; workflows call scripts, not forked skill copies.

## Related

- [stages/eval.md](stages/eval.md) — rubric backlog that often feeds skill edits
- [dispatch.md](dispatch.md) — harness detection for implementers
- [operations.md](operations.md) — subagent lifecycle
- [repo-hygiene.md](repo-hygiene.md) — anti-bloat for skill trees
- [optimizexp AX agents-config](../../optimizexp/references/ax/agents-config.md) — host matrix
