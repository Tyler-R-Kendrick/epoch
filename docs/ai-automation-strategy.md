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

This document is an audit, not a proposal to rebuild. Findings combine
repository evidence with external checks — GitHub API state, subscription and
connector state, deployment status, and the remote-session environment. External
checks are dated and name the command used, because unlike the repository
contents they are not reproducible from a checkout.

All external checks below were performed on **2026-08-09**.

> **Status (2026-08-10):** Sequenced-plan items 1–3 are implemented — see
> [Sequenced plan](#sequenced-plan) for what changed and what's still open.
> The findings below are left as originally written, since they are the
> evidence and reasoning that justified the change, not a live status page;
> read them as "the state that motivated this" rather than "the state today."

## Inventory: connected versus used

| Capability | Connected | Used by this repo | Gap |
|---|---|---|---|
| GitHub Actions | Yes | **Now yes** — Quality Gates run on every pull request and every push to `main` (Now item 1) | ~~Quality gate runs on the developer's laptop~~ Closed |
| Claude Code (project config) | Yes | **Now partially** — tracked `.claude/settings.json` + SessionStart hook (Now item 2); hooks/commands/subagents beyond that remain Next item 5 | Agent behavior is still mostly prose-only outside the session-repair hook |
| Claude Code (remote/web sessions) | Yes | **Now yes** — SessionStart hook installs and repairs the environment (Now item 2) | Closed for the NODE_OPTIONS defect; general reliability still worth watching |
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
conserve GitHub Actions runner minutes. `GET /repos/Tyler-R-Kendrick/epoch`
(2026-08-09) reports `"private": false, "visibility": "public"`. GitHub Actions
on **standard** GitHub-hosted runners is free and unmetered for public
repositories, on every plan tier.

**Cost of the false premise.** The entire quality bar was pushed into
`.githooks/pre-push`, which runs `gate:push` — `gate:fast` plus `typecheck`,
plus a `build` that is a ~30-link serial `&&` chain of `npm run build -w …`,
plus unit tests — before every single push. `npm run verify` adds a second
`build`, a third for coverage, and a fourth for Pact. That serial cost is paid
by a human waiting at a terminal, to save money that was never being spent.

It also blocks a specific class of downstream work — though not everything, and
the distinction matters. What genuinely requires an Actions workflow run:
Claude Code Action, scheduled agent runs, CodeQL scanning workflows, and per-PR
accessibility (`a11y:community-web`, `community-web:app:a11y`), Pact, and coverage
evidence. What does **not**: Copilot code review is a GitHub-native pull-request
feature enabled by policy rather than by a workflow in this repository, and
Dependabot version and security updates run on GitHub's own infrastructure and
continue even where Actions is disabled. Those two are unused here by choice,
not by blockage — which makes them the cheapest items in the plan below.

**Move.** Re-enable `pull_request` and `push` triggers on `ubuntu-latest`. Keep
the hooks as a fast local pre-flight (`gate:fast` on commit), and demote
`pre-push` to the same fast gate so pushing stops costing minutes of local wall
clock. Move `typecheck`, `build`, unit, Cucumber, coverage, Pact, axe, and
Community Web e2e into parallel CI jobs. Then correct the three documents that
assert the constraint.

Do **not** simply delete the `EPOCH_CI_DISABLED` safety net. Replace it with a
fail-closed billing guard, because the reasoning above holds only while two
conditions are true — the repository is public, and jobs run on standard
runners. Both can change silently through a visibility flip, a transfer to an
organization, or a `runs-on` edit in a later PR. A first step that asserts
`github.event.repository.private == false` and pins `runs-on: ubuntu-latest`,
failing rather than proceeding when either check does not hold, keeps a future
change from quietly turning free CI into billed CI. **Larger runners are billed
even on public repositories**, so the runner pin is the load-bearing half.
Browser jobs use the Google Chrome already included on the standard Ubuntu
image; they do not download a second browser from Playwright's CDN.

## Finding 2 — no Claude Code configuration is version-controlled

**Evidence.** There is no `.claude/` directory in the tree. `.gitignore`
excludes `.claude/skills/`, `.claude/hooks/`, `.claude/commands/impeccable*`,
`.github/agents/`, `.github/skills/`, `.codex/`, and `.grok/` — every one of
those exclusions is for *vendored* skill trees, which is correct, but the net
effect is that **no tracked `.claude/` runtime configuration exists**. To be
precise about what does exist: `AGENTS.md`, `skills/epoch/`, and
`skills/optimizexp/` are substantial project-authored agent instructions. What
is missing is the executable layer — settings, hooks, commands, and subagent
definitions — not instruction content.

**Cost.** `AGENTS.md` is 7 KB of prose that every agent must read and
voluntarily obey. It says "Never skip hooks to greenwash a change" and "Do not
lower coverage thresholds." Those are hopes, not controls. An agent that ignores
them fails silently, and the failure is only caught if a human reads the diff.

**Move.** Add a tracked `.claude/` with three things:

- **`settings.json` hooks that give the prose fast local teeth.** A `PreToolUse`
  hook that rejects `Bash` commands containing `SKIP_GIT_HOOKS=1` or
  `SKIP_VERIFY=1`; a `PreToolUse` hook that rejects `Edit` against `.c8rc.json`
  thresholds, `eslint.config.mjs` severity downgrades, or `konsistent.json` rule
  deletions; a `PostToolUse` hook that runs `docs:check` after any Markdown
  write.

  Be honest about what this layer is worth. These hooks are **local feedback and
  a pre-tool speed bump, not the enforcement boundary.** A `PreToolUse` matcher
  inspects the command string, so shell indirection, an env-var alias, or a
  wrapper script can slip past a substring check. Any override file the hook
  consults is writable by the same agent the hook constrains. `PostToolUse` runs
  *after* the write lands and can report a docs break but cannot undo it. The
  authoritative gates are CI (Finding 1) and branch protection requiring those
  checks — which is another reason Finding 1 comes first in the plan. Hooks
  catch the honest mistake early and cheaply; they do not stop a determined
  bypass, and this document should not be read as claiming otherwise.
- **Slash commands for the rituals that already exist as prose.** The
  documentation-freshness matrix, the adversarial design-critique protocol, and
  the persona-matrix reconciliation are each a checklist an agent re-derives
  from scratch every run. They are slash commands.
- **Subagent definitions.** `skills/epoch/agents/sdlc.yaml` already defines an
  SDLC reviewer, and its `default_prompt` is the substance worth keeping. It
  cannot be copied across as-is: Claude Code project subagents are **Markdown
  files with YAML front matter** under `.claude/agents/`, where `name` and
  `description` are the required fields and the Markdown body is the system
  prompt. The work is a translation of that YAML into one `.claude/agents/*.md`
  file, not a file move.

The repository already publishes `skills/epoch/marketplace.json` declaring
`compatible_agents: ["claude", "github-copilot", "open-agent"]`, which shows the
distribution intent is already there. That file is **not** a Claude Code plugin
manifest and will not become one by extension. A plugin is its own directory
with a `.claude-plugin/plugin.json` manifest and standard component directories
(`skills/`, `agents/`, `commands/`, `hooks/`) at the plugin root, beside rather
than inside `.claude-plugin/`. Packaging the repo's workflow that way — skills,
commands, hooks, and subagents in one versioned bundle — makes it installable
rather than copy-pasted, but it is a new artifact built alongside the existing
marketplace descriptor. Validate both the translated subagent and the plugin
layout before committing to the format.

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
`maxPersonas: 12`, `maxFeatures: 12`, `passes: "infinite"`. That is up to 144
judgments **per pass, per surface**; with `passes: "infinite"` the total is
bounded only by plateau detection, not by configuration. Run sequentially, those
judgments share — and pollute — a single context. Runs reach "Pareto
equilibrium" partly from context exhaustion
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

**Bound it before enabling it.** Sequential execution has been acting as an
accidental rate limiter: one judgment at a time, a human watching, easy to stop.
Fan-out removes that safety property, and `passes: "infinite"` means a run that
fails to converge has no configured stopping point. Parallelism must not be
switched on before the limits exist:

- **Max concurrency** — a fixed cap on simultaneous subagents, not
  persona-count-driven, so panel growth cannot widen the fan.
- **Per-run and per-persona budgets** — a token or call ceiling that aborts the
  run when crossed, with what was dropped recorded rather than silently skipped.
- **Timeout and bounded retry** — a per-subagent deadline and capped retries
  with backoff, so one wedged persona cannot stall or multiply the run.
- **A hard termination rule** — a maximum pass count that overrides
  `passes: "infinite"`, so plateau detection is the *normal* exit and not the
  *only* one.
- **Cancellation** — one failing persona must be able to abort the run rather
  than leaving siblings to finish against a dead aggregate.
- **Deterministic aggregation order** — scores must be sorted by persona ID
  before aggregation, not by completion order, or the same inputs will produce
  different `runs/<id>/` output on every execution and the plateau signal
  becomes unreproducible.

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

**Privacy comes first, and this is not boilerplate.** Community Web is a
social surface: messages, handles, DIDs, signed actions, moderation state. It is
the *worst* place to switch on session replay without design.
`AGENTS.md` already requires every Community change to account for privacy,
trust, security, and portability, and an analytics rollout is exactly such a
change. Do this before any SDK is installed:

- **Data inventory.** Enumerate what each event would carry, and decide per
  field whether it is needed. Handles, DIDs, message bodies, and repository
  paths are identifying; "clicked the receipt panel" is not.
- **Consent and opt-out** that hold on a federated, portable-identity product,
  where "delete my account" must mean something across surfaces.
- **Masking by default** for replay — text and inputs redacted unless a field
  is explicitly allow-listed, rather than the reverse.
- **Retention, deletion, and access control** stated as numbers and names, not
  intentions.
- **Production sampling**, so instrumentation cannot become a performance or
  cost regression on the surface it is meant to measure.

An ADR is the right home for these decisions, and it should land before the
instrumentation does.

**Move.** With those controls defined, instrument Community Web and make the
existing backlog schema the bridge:

- Map each `featureIds` entry to a PostHog feature flag, and each
  `smallestExperiment` to a PostHog experiment with the `impactOn` scores as the
  pre-registered hypothesis. Pre-registration is already in the schema; only the
  measurement is missing.
- Use surveys, and — only behind the masking and consent controls above —
  session replay, against the same personas the panel models. The
  `screen-reader-power-user` and `community-moderator` lenses in particular make
  claims that observation can confirm or kill.
- Add a `measured` field alongside `impactOn` and populate it wherever a
  surface can be measured, so `done` stops meaning only "we shipped it."
  Deliberately *not* a hard gate on `status: "done"`: much of the backlog is
  craft and responsive-layout work with no meaningful conversion metric, and
  blocking those items on telemetry would stall the backlog behind an
  instrumentation program while teaching everyone to fake the field.

Second, smaller use: PostHog LLM analytics can track the agent runs themselves —
cost, latency, and failure class per persona — which turns the dispatch log's
`Failure class` column from hand-written prose into data.

## Finding 5 — Copilot is a second labor pool sitting idle

**Evidence.** `assign_copilot_to_issue` and `create_pull_request_with_copilot`
are available on this repository, and the repo has zero open issues. Both
surfaces are steered by repository instruction files — for code review, the
documented sources are `.github/copilot-instructions.md` for repository-wide
guidance, path-scoped `*.instructions.md` files under `.github/instructions/`
with an `applyTo` glob, and `AGENTS.md` for agent-facing project context. Epoch
already has an excellent `AGENTS.md` for both to obey, and the path-scoped form
maps cleanly onto this monorepo's per-package boundaries.

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

**Evidence.** Observed 2026-08-09 in a Claude Code remote container, Node
**v22.22.2**. `NODE_OPTIONS` carries this exact raw value, brackets and inner
double quotes included:

```text
["--import tsx" --max-old-space-size=8192]
```

Every `node` and `npm` invocation then fails with
`node: --import tsx is not allowed in NODE_OPTIONS`. `npm ci` fails at the
`prepare` step, `npm run build` fails on the first workspace, and no gate can
run.

The value is **malformed, and that is the whole defect** — this is not a Node
limitation and not a problem with `tsx`. `--import` has been permitted in
`NODE_OPTIONS` since Node 18.19 / 20.6, and v22.22.2 supports it. Node's
`NODE_OPTIONS` parser splits on whitespace and treats a double-quoted run as one
token, so `"--import tsx"` arrives as the single argument `--import tsx`, which
is not a flag name — hence the error naming `--import tsx` rather than
`--import`. The surrounding `[` and `]` indicate a JSON array that was
string-formatted into the environment instead of being joined. A correctly
formed `NODE_OPTIONS=--import tsx --max-old-space-size=8192` would work fine
here. Anything derived from this finding should target the malformed value, not
the flag.

**Cost.** This is very likely why the dispatch log says "no cloud dispatch" on
every entry. Cloud-dispatched agents cannot verify their own work here, so all
work funnels back to one local machine — which then also carries the entire
Finding 1 gate cost. The two findings compound.

**Move.** Add a `SessionStart` hook that normalises the environment before any
work begins — but make it **idempotent**, because `SessionStart` fires on
`resume`, `clear`, and `compact` as well as `startup`. An unconditional
`npm ci` would wipe and reinstall roughly 30 workspaces every time context is
compacted, which on this repository is minutes of wall clock per event.

The hook should be a sequence of guarded checks, each a no-op when already
satisfied:

1. Repair `NODE_OPTIONS` only when it fails to parse — probe with
   `node -e 0` and rewrite or unset the variable only on failure. A session
   whose environment is already sane should not be touched.
2. Install only when the tree is actually missing or stale: skip when
   `node_modules/.bin/tsgo` resolves, and prefer `npm install` over `npm ci`
   where a usable `node_modules` already exists, since `npm ci` deletes the tree
   first by design.
3. Verify after installing rather than assuming — `npm ci` runs `prepare`
   (`scripts/install-hooks.mjs`), and that lifecycle script must complete before
   anything relies on the toolchain or on `core.hooksPath` being wired. Check
   the exit status and the presence of `node_modules/.bin/tsgo` before
   reporting success.

Note also that `SessionStart` is documented to be unreliable on `/clear` in some
Claude Code versions, so the hook should be a convenience that fails loudly, not
a correctness dependency. It remains the prerequisite for every other
cloud-dispatch recommendation in this document.

## Finding 7 — design and docs subscriptions are unconnected to the gates

**Figma.** `packages/Epoch.DesignTokens` generates tokens from a local script;
[`DESIGN.md`](../DESIGN.md) is linted by `@google/design.md`; design evidence is
PNG mocks under `.impeccable/mocks/` and screenshots under `docs/evidence/`. The
adversarial critique protocol therefore judges *screenshots* against *prose*. If
a Figma file exists for Community Web, the token round-trip and Code Connect
component mapping give the critique a real design source of truth to diff
against. If the design lives only in code — which the Community Web exploration
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

1. ✅ 🔥 **Re-enable Actions on `ubuntu-latest`**, replacing `EPOCH_CI_DISABLED`
   with a fail-closed public-repo and standard-runner guard; correct the
   runner-minute claim in `AGENTS.md`, `DX.md`, and `quality.yml`. **[S]**
   *Done 2026-08-10: `.github/workflows/quality.yml` now runs docs, lint,
   konsistent, design, typecheck, test, coverage, Pact, and the
   Community Web/a11y suites as separate jobs behind a `guard` job that fails
   the run if `github.event.repository.private` is true.*
2. ✅ 🔥 **Add the idempotent `SessionStart` hook** that repairs `NODE_OPTIONS`
   only when malformed and installs only when missing, so remote and
   cloud-dispatched sessions can build. **[S]**
   *Done 2026-08-10: `.claude/settings.json` + `.claude/hooks/session-start.sh`
   (carved out of the vendor-skill `.gitignore` exclusion). Validated live
   against all three branches: with the exact malformed `NODE_OPTIONS` from
   Finding 6 present, the hook detected it and cleared it via
   `$CLAUDE_ENV_FILE`; with `node_modules/.bin/tsgo` missing it ran `npm ci`;
   with it already present it skipped install and reported ready in under a
   second, confirming the resume/clear/compact cost this item exists to avoid
   is actually avoided. Two corrections made during validation, both from
   things that only showed up under a real run: the install-status check
   originally trusted the *presence* of `node_modules/.bin/tsgo` alone, which
   is a false positive if the install was interrupted after linking that one
   binary — it now also captures and reports the install command's own exit
   status. Separately, the hook now defensively sets
   `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before installing, since that variable
   was observed unset in this session despite being documented as
   pre-configured; unset, a Playwright postinstall can stall attempting a
   browser download in an environment that already has one. (A third,
   unrelated stall was also observed and left alone: `@higgsfield/cli`'s own
   postinstall downloads a release binary over raw `https`, bypassing this
   environment's configured proxy — a pre-existing issue in that dependency's
   installer, not something this hook can or should route around.)*
3. ✅ **Demote `pre-push` to `gate:fast`** once CI carries the heavy tail. **[S]**
   *Done 2026-08-10: `.githooks/pre-push` now runs `gate:fast`, matching
   `pre-commit`; `gate:push` remains an optional manual command
   (`AGENTS.md`'s command table) but is no longer hook-wired.*
4. ⛔ **Turn on Copilot code review** for every PR — no workflow required. **[S]**
   *Blocked 2026-08-10: this is a repository-settings toggle (Settings → Code
   review → Copilot, or the equivalent org policy), not a file change, and no
   tool available to this session can flip it. Left for the maintainer;
   everything else on this line — `.github/copilot-instructions.md` /
   path-scoped `*.instructions.md` / `AGENTS.md` as the instruction sources —
   was already true before this pass.*

### Next — converts prose into controls

5. **Track `.claude/`**: settings hooks as fast local feedback (with CI and
   branch protection as the real gate), slash commands for the doc-freshness and
   design-critique rituals, and the SDLC reviewer translated into a Markdown
   subagent. **[M]**
6. **Parallelise the persona panel** one subagent per persona — only after the
   concurrency cap, budgets, timeouts, termination rule, and deterministic
   aggregation order are in place. **[M]**
7. **Write the telemetry privacy ADR** — data inventory, consent, masking,
   retention, deletion, access control, sampling. Prerequisite for item 8, and
   worth doing even if PostHog is never adopted. **[M]**
8. **Instrument Community Web with PostHog** behind that ADR; add a `measured`
   field to the experiment backlog wherever a surface can be measured. **[M]**
9. **Assign the Turborepo migration to Copilot coding agent** as a specified
   issue, reviewed against the gate. **[M]**

### Later — compounding

10. **Package the repo workflow as a Claude Code plugin** — a new
    `.claude-plugin/plugin.json` bundle alongside, not an extension of,
    `skills/epoch/marketplace.json`. **[M]**
11. **Scheduled agent runs** — a nightly dependency-drift and docs-freshness
    sweep, and a weekly persona regression against the deployed site. Cheap once
    items 1, 2, and 6 are done; wasteful before. **[S]**
12. **Confirm whether a Figma source of truth exists**, then decide between
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
- **Agent-side hooks are not the security boundary.** Everything in Finding 2
  is local convenience. CI checks plus branch protection are what actually
  prevent a bad change from reaching `main`, and no amount of `.claude/`
  configuration substitutes for them.
- **Instrumentation is a product change, not a plumbing change.** Adding
  analytics to a social surface carrying handles, DIDs, and messages goes
  through the same persona, trust, and privacy review as any other Community
  change. Shipping it as "just wiring up a script tag" is the failure mode to
  avoid.

## Related documents

- [DX](../DX.md) — build-system and toolchain adoption checklist.
- [AGENTS.md](../AGENTS.md) — repository agent instructions and quality gates.
- [Documentation Freshness Policy](documentation-freshness.md) — the docs matrix
  referenced above.
- [SDLC dispatch log](plans/dispatch-log.md) — coordinator run outcomes.
- [Community Human-Centered Design](community-human-centered-design.md) — the
  adversarial design-critique protocol.
