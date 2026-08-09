---
type: Reference
title: "AI subscription and automation strategy"
description: "Audit of how Epoch's connected AI subscriptions are used today, the gaps, and a sequenced plan to close them."
tags: [epoch, devex, automation, agents, ci]
---

# AI subscription and automation strategy

Epoch already has more agent infrastructure than most repositories its size: a
persona panel, a write-ahead agent bus, an adversarial design-critique protocol,
a structural-convention gate, an executable feature registry, and a published
agent skill. The problem is not missing tooling. The problem is that the
highest-value parts of that tooling are **gated behind a cost constraint that
does not exist**, and the connected subscriptions are largely **not wired to
anything**.

This document is an audit, not a proposal to rebuild. Every finding below cites
what is in the repository today.

## Inventory: connected versus used

| Capability | Connected | Used by this repo | Gap |
|---|---|---|---|
| GitHub Actions | Yes | **No** — `workflow_dispatch` only | Quality gate runs on the developer's laptop |
| Claude Code (project config) | Yes | **No** — no tracked `.claude/` | Agent behavior is prose-only, unenforced |
| Claude Code (remote/web sessions) | Yes | Partially | Remote sessions cannot build the repo |
| GitHub Copilot coding agent | Yes | **No** | Second labor pool sitting idle |
| Copilot code review | Yes | **No** | CodeRabbit is the only automated reviewer |
| PostHog | Yes | **No** — zero references in the tree | Experiment backlog has no real-user signal |
| Figma MCP | Yes | **No** | Design truth is PNG mocks and screenshots |
| Context7 / Microsoft Learn MCP | Yes | **No** | Bleeding-edge deps with no doc grounding |
| Vercel | Yes | Yes (direct git deploy) | Preview URLs not fed back into review |
| Supabase, Cloudflare, higgsfield | Yes / unauthorized | No | Out of scope for now |

## Finding 1 — the runner-minute constraint is not real

**Evidence.** `AGENTS.md`, [`DX.md`](../DX.md), and
`.github/workflows/quality.yml` all state that Quality Gates are disabled to
conserve GitHub Actions runner minutes. The GitHub API reports this repository
as `"private": false, "visibility": "public"`. GitHub Actions on **standard**
GitHub-hosted runners is free and unmetered for public repositories, on every
plan tier.

**Cost of the false premise.** The entire quality bar was pushed into
`.githooks/pre-push`, which runs `gate:push` — `gate:fast` plus `typecheck`,
plus a `build` that is a ~30-link serial `&&` chain of `npm run build -w …`,
plus unit tests — before every single push. `npm run verify` adds a second
`build`, a third for coverage, and a fourth for Pact. That serial cost is paid
by a human waiting at a terminal, to save money that was never being spent.

It also blocks everything downstream: Copilot code review, Claude Code Action,
CodeQL, Dependabot, scheduled agent runs, and per-PR accessibility and Pact
evidence all live in CI, and there is no CI.

**Move.** Re-enable `pull_request` and `push` triggers on `ubuntu-latest`, and
clear the `EPOCH_CI_DISABLED` safety net. Keep the hooks as a fast local
pre-flight (`gate:fast` on commit), and demote `pre-push` to the same fast gate
so pushing stops costing minutes of local wall clock. Move `typecheck`, `build`,
unit, Cucumber, coverage, Pact, axe, and Nightboard e2e into parallel CI jobs.
Then correct the three documents that assert the constraint.

One real caveat: **larger runners are still billed even on public repos.** Stay
on standard `ubuntu-latest` and this stays free.

## Finding 2 — no Claude Code configuration is version-controlled

**Evidence.** There is no `.claude/` directory in the tree. `.gitignore`
excludes `.claude/skills/`, `.claude/hooks/`, `.claude/commands/impeccable*`,
`.github/agents/`, `.github/skills/`, `.codex/`, and `.grok/` — every one of
those exclusions is for *vendored* skill trees, which is correct, but the net
effect is that **no project-authored agent configuration exists at all**.

**Cost.** `AGENTS.md` is 7 KB of prose that every agent must read and
voluntarily obey. It says "Never skip hooks to greenwash a change" and "Do not
lower coverage thresholds." Those are hopes, not controls. An agent that ignores
them fails silently, and the failure is only caught if a human reads the diff.

**Move.** Add a tracked `.claude/` with three things:

- **`settings.json` hooks that make the prose enforceable.** A `PreToolUse` hook
  that rejects `Bash` commands containing `SKIP_GIT_HOOKS=1` or `SKIP_VERIFY=1`
  unless an override file is present; a `PreToolUse` hook that rejects `Edit`
  against `.c8rc.json` thresholds, `eslint.config.mjs` severity downgrades, or
  `konsistent.json` rule deletions; a `PostToolUse` hook that runs
  `docs:check` after any Markdown write. Deterministic scripts at lifecycle
  points are how repository policy stops being advisory.
- **Slash commands for the rituals that already exist as prose.** The
  documentation-freshness matrix, the adversarial design-critique protocol, and
  the persona-matrix reconciliation are each a checklist an agent re-derives
  from scratch every run. They are slash commands.
- **Subagent definitions.** `skills/epoch/agents/sdlc.yaml` already defines an
  SDLC reviewer as a *Codex* prompt. The same definition belongs in
  `.claude/agents/` so it runs with a clean context and returns only its verdict.

The repository already publishes `skills/epoch/marketplace.json` declaring
`compatible_agents: ["claude", "github-copilot", "open-agent"]`. Packaging the
repo's own workflow as a Claude Code **plugin** — skills plus commands plus
hooks plus subagents in one versioned bundle — is the natural next step and
makes the whole thing installable rather than copy-pasted.

## Finding 3 — the SDLC coordinator's fan-out was designed and never wired

**Evidence.** Every entry in [`docs/plans/dispatch-log.md`](plans/dispatch-log.md)
records the same backend: *"Sequential fallback; no subagent or cloud dispatch"*
or *"coordinator inline."* Meanwhile `skills/optimizexp/references/agent-bus.md`
specifies an append-only expect/act/outcome bus with per-persona scorecards, and
`skills/optimizexp/references/cross-agent/deterministic-workflows.md` specifies a
deterministic runner that owns aggregation and plateau detection while the agent
owns judgment. That is precisely a fan-out architecture — written down, then run
single-threaded every time.

**Cost.** The panel is 12–17 personas. `.optimizexp/config.json` sets
`maxPersonas: 12`, `maxFeatures: 12`, `passes: "infinite"`. Run sequentially in
one context window, that is up to 144 judgments sharing — and polluting — a
single context. Runs reach "Pareto equilibrium" partly from context exhaustion
rather than from genuine convergence, and persona independence, which is the
entire point of an adversarial panel, is compromised the moment persona 7 can
see what persona 3 said.

**Move.** Persona judgment is embarrassingly parallel and each persona wants a
clean context. Run one subagent per persona per surface, each returning a
structured scorecard against the existing `metric-scorecard.md` schema; keep
score aggregation, plateau detection, and bus-entry validation in the
deterministic runner that the reference already calls for. This is the
LLM-as-judge pattern the panel already implements, minus the cross-contamination
— and it converts a long serial run into one that finishes in the time of its
slowest persona.

## Finding 4 — PostHog is connected and the experiment loop has no real users

**Evidence.** `grep -rl posthog` over the tree returns nothing. Meanwhile
`.optimizexp/backlog/experiments.json` is a structured experiment program:
each item carries a `hypothesis`, `smallestExperiment`, `antiGoals`, an
`impactOn` block scoring `excitement` / `easeOfUse` / `perceivedOptimality`, and
a `priorityScore`.

**Cost.** Those `impactOn` numbers are *predictions by synthetic personas*, and
they are currently never checked against anything. The loop closes on itself:
personas propose, personas judge, personas confirm. Community Web is deployed
and publicly reachable at the Vercel URL, so real signal is available and simply
not collected.

**Move.** Instrument Community Web with PostHog and make the existing backlog
schema the bridge:

- Map each `featureIds` entry to a PostHog feature flag, and each
  `smallestExperiment` to a PostHog experiment with the `impactOn` scores as the
  pre-registered hypothesis. Pre-registration is already in the schema; only the
  measurement is missing.
- Use session replay and surveys against the same personas the panel models —
  the `screen-reader-power-user` and `community-moderator` lenses in particular
  make claims that replay can confirm or kill.
- Add a `measured` field alongside `impactOn` and require it before an item
  moves to `status: "done"`. Today `done` means "we shipped it," not "it worked."

Second, smaller use: PostHog LLM analytics can track the agent runs themselves —
cost, latency, and failure class per persona — which turns the dispatch log's
`Failure class` column from hand-written prose into data.

## Finding 5 — Copilot is a second labor pool sitting idle

**Evidence.** `assign_copilot_to_issue` and `create_pull_request_with_copilot`
are available on this repository, and the repo has zero open issues. Copilot
coding agent reads root and nested `AGENTS.md` files, and Copilot code review
reads `CLAUDE.md` and `REVIEW.md` — Epoch already has an excellent `AGENTS.md`
for it to obey.

**Cost.** Mechanical, well-specified, high-volume chores currently consume
Claude context that should be spent on design and architecture.

**Move.** Route work by shape, not by preference:

- **Copilot coding agent** takes the mechanical migrations: the Turborepo
  adoption in `DX.md` item 1, converting the ~30-link `build` and `typecheck`
  chains, the shared-config package in item 6, dependency bumps, and
  docs-index synchronisation. These are large, boring, and verifiable by the
  gate — ideal for an agent whose output you review rather than supervise.
- **Copilot code review** becomes the always-on first pass on every PR, ahead
  of CodeRabbit. The dispatch log already records CodeRabbit silently skipping a
  large diff; a second independent reviewer covers that failure mode.
- **Claude** keeps design, architecture, the persona panel, ADRs, and anything
  touching history, identity, signatures, or content-addressed storage — which
  `AGENTS.md` already designates security-sensitive.

## Finding 6 — remote Claude sessions cannot build this repository

**Evidence.** In this remote session, `NODE_OPTIONS` is set to
`["--import tsx" --max-old-space-size=8192]`. The quoted `--import tsx` is
rejected by Node, so **every** `node` and `npm` invocation fails with
`node: --import tsx is not allowed in NODE_OPTIONS`. `npm ci` fails at the
`prepare` step, `npm run build` fails on the first workspace, and no gate can
run.

**Cost.** This is very likely why the dispatch log says "no cloud dispatch" on
every entry. Cloud-dispatched agents cannot verify their own work here, so all
work funnels back to one local machine — which then also carries the entire
Finding 1 gate cost. The two findings compound.

**Move.** Add a `SessionStart` hook that normalises the environment before any
work begins: unset or repair `NODE_OPTIONS`, run `npm ci`, and confirm
`node_modules/.bin/tsgo` exists. This is exactly what the session-start-hook
pattern is for, and it is the prerequisite for every other cloud-dispatch
recommendation in this document.

## Finding 7 — design and docs subscriptions are unconnected to the gates

**Figma.** `packages/Epoch.DesignTokens` generates tokens from a local script;
[`DESIGN.md`](../DESIGN.md) is linted by `@google/design.md`; design evidence is
PNG mocks under `.impeccable/mocks/` and screenshots under `docs/evidence/`. The
adversarial critique protocol therefore judges *screenshots* against *prose*. If
a Figma file exists for Nightboard, the token round-trip and Code Connect
component mapping give the critique a real design source of truth to diff
against. If the design lives only in code — which the Nightboard exploration
suggests — the win is narrower: generating a shareable Figma artifact from code
for review, not a two-way sync. Worth confirming which case applies before
investing.

**Context7 and Microsoft Learn.** The stack is deliberately bleeding-edge:
`eslint@10`, `@typescript/native-preview` dev builds, `vite@8`, `react@19.2`,
`@types/node@25`. `DX.md` item 3 flags this as a reproducibility risk. Context7
is what makes bleeding-edge survivable — resolving current library docs before
writing integration code, rather than relying on model training data that
predates the release. Make it a standing instruction for dependency and
integration work.

## Sequenced plan

Effort sizing follows the `DX.md` convention.

### Now — unblocks everything else

1. 🔥 **Re-enable Actions on `ubuntu-latest`**; correct the runner-minute claim
   in `AGENTS.md`, `DX.md`, and `quality.yml`. **[S]**
2. 🔥 **Add the `SessionStart` hook** that repairs `NODE_OPTIONS` and installs,
   so remote and cloud-dispatched sessions can build. **[S]**
3. **Demote `pre-push` to `gate:fast`** once CI carries the heavy tail. **[S]**
4. **Turn on Copilot code review** for every PR. **[S]**

### Next — converts prose into controls

5. **Track `.claude/`**: settings hooks for the anti-greenwashing rules,
   slash commands for the doc-freshness and design-critique rituals, and the
   SDLC reviewer as a subagent. **[M]**
6. **Parallelise the persona panel** one subagent per persona, keeping
   aggregation and plateau detection in the deterministic runner. **[M]**
7. **Instrument Community Web with PostHog**; add a `measured` field to the
   experiment backlog and require it before `status: "done"`. **[M]**
8. **Assign the Turborepo migration to Copilot coding agent** as a specified
   issue, reviewed against the gate. **[M]**

### Later — compounding

9. **Package the repo workflow as a Claude Code plugin**, extending the existing
   `skills/epoch/marketplace.json`. **[M]**
10. **Scheduled agent runs** — a nightly dependency-drift and docs-freshness
    sweep, and a weekly persona regression against the deployed site. Cheap once
    items 1, 2, and 6 are done; wasteful before. **[S]**
11. **Confirm whether a Figma source of truth exists**, then decide between
    token round-trip plus Code Connect, or code-to-Figma artifact generation
    only. **[M]**

## Guardrails

Some things should stay manual, and this document is not an argument against
them:

- **Persona judgment stays a judgment.** Parallelising the panel must not turn
  scorecards into a rubber stamp; the `antiGoals` and adversarial-critique
  automatic-fail rules exist precisely to keep "it works" from counting as
  acceptance.
- **Security-sensitive paths keep a human.** History, identity, signatures, and
  content-addressed storage are already designated as such in `AGENTS.md`.
  Copilot coding agent should not be assigned issues that touch them.
- **Do not automate the dispatch log into meaninglessness.** Its value is the
  honest `Failure class` and `Notes` columns, including the entry recording an
  emergency hook bypass. Machine-generated rows would lose that.
- **Real telemetry does not retire the personas.** PostHog measures what users
  did; the panel predicts what they would feel about something not yet built.
  The backlog schema already has room for both.

## Related documents

- [DX](../DX.md) — build-system and toolchain adoption checklist.
- [AGENTS.md](../AGENTS.md) — repository agent instructions and quality gates.
- [Documentation Freshness Policy](documentation-freshness.md) — the docs matrix
  referenced above.
- [SDLC dispatch log](plans/dispatch-log.md) — coordinator run outcomes.
- [Community Human-Centered Design](community-human-centered-design.md) — the
  adversarial design-critique protocol.
