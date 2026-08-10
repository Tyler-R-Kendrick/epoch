---
name: gauntlet-loop
description: >-
  Runs spec-grounded, counterexample-driven improvement campaigns over code,
  agents, research, and multimodal artifacts. Use when a task needs durable
  iteration, materialized candidates, trace analysis, independent evaluators,
  replayable experiments, non-regression gates, or auditable promotion rather
  than one-shot generation or informal self-critique.
compatibility: >-
  Requires Python 3.11+, uv, and Git. ActiveGraph is the event-sourced runtime.
  Optional integrations use LangSmith CLI, OpenTelemetry, NeMo Relay ATOF,
  ORAS, cosign, Microsoft Agent Framework declarative workflows, and
  domain-specific tools when installed.
license: MIT
metadata:
  version: "0.1.0"
  contract: "dev.gauntlet/v1"
---

# Gauntlet Loop

Turns an open-ended builder/critic loop into a bounded, durable, auditable,
counterexample-driven improvement system. Agents may propose artifacts,
diagnoses, interventions, evaluators, and actions. Durable evidence determines
what happened. A write-ahead authority protocol determines what may execute.
Controlled counterfactual experiments determine whether a repair works. A
frozen, independent promotion kernel determines what becomes canonical. A
separate release decision determines what may affect the outside world.

## Use this skill when / do not use it when

Use it when a task needs durable multi-session iteration, a frozen quality
spec, materialized candidates in Git worktrees, independent evaluators,
counterexample memory, replayable history, non-regression promotion gates, or
auditable outward effects.

Do not use it for one-shot generation, a quick edit with an obvious test, a
question that needs no durable state, or informal self-critique that will not
be promoted anywhere.

## Invariants

- The scripts own durable state. Never hand-edit generated ledgers under
  `.gauntlet/ledger/`, the ActiveGraph store under `.gauntlet/state/`, or
  generated workflow YAML. Propose changes through commands.
- The scripts are a deterministic control plane: no embedded LLM, no network
  in the core loop. You (the host agent) provide the open-ended reasoning as
  structured proposals; the CLI validates, persists, authorizes, and compares.
- Observation ≠ diagnosis ≠ intervention ≠ decision. Record them separately.

## Canonical invocation

```bash
uv run --project <skill-root> gauntlet <command> [options]
```

`<skill-root>` is this directory. All commands support `--json` (stable
machine-readable stdout), `--dry-run` (plan without mutating), and
`--non-interactive` (fail instead of prompting — a missing approval is never
treated as approval). Diagnostics go to stderr.

## The core loop

1. `gauntlet project init` — create `.gauntlet/` durable state.
2. `gauntlet profile select <name>` — pick one domain profile.
3. `gauntlet spec init`, edit, `gauntlet spec validate`, `gauntlet spec freeze`.
4. `gauntlet campaign start` — frozen spec, budget, stop rules, baseline.
5. `gauntlet observe import|record` — raw evidence in, preserved by digest.
6. `gauntlet issue cluster` and `gauntlet counterexample add|minimize`.
7. `gauntlet diagnosis record` — a falsifiable hypothesis with a falsifier.
8. `gauntlet experiment propose|fork` — one hypothesis, one action seam,
   smallest mutation surface, isolated worktree.
9. Edit only inside the candidate worktree's permitted globs.
10. `gauntlet experiment run|compare` — declared commands only, paired deltas.
11. `gauntlet evaluate search` then `gauntlet evaluate promotion` (held-out).
12. `gauntlet promote plan|apply` — fail-closed local promotion.
13. `gauntlet release plan|approve|apply` — separately authorized outward
    effects.
14. `gauntlet campaign checkpoint` / `stop` — durable handoff, recorded stop.

## What do I do now?

Run the state-driven oracle:

```bash
uv run --project <skill-root> gauntlet next --json
```

It returns `campaign_id`, `state`, `allowed_commands`, `blocked_commands`
(with reasons), `reference`, `stop`, `unresolved`, and `approval_required`,
computed deterministically from durable state and policy — never by an LLM.
Load **only** the reference file it names, act, and run `next` again. Never
preload all references.

## Authority and effect safety

- Every effect-bearing operation needs a write-ahead intent that reached
  `committed`. No commit, no effect.
- Action classes are ActiveGraph's closed R0–R4: R0 inspect, R1 bounded local
  writes, R2 costly/local-promotion (approval required), R3 outward effects
  (human approval, always), R4 governance/root-of-trust (governance gate,
  always). Missing or invalid class fails closed. Local policy may lower the
  ceiling, never raise it.
- Effect classes are orthogonal (`pure` … `irreversible_gated`, `unknown`).
  An `outcome_unknown` non-idempotent effect is never auto-retried; it
  reconciles.
- Frozen surfaces (policies, schemas, sealed promotion data, evaluators, the
  promotion/authority/effects kernels) are off-limits to candidates. A
  candidate can never approve itself.
- Details: [references/safety.md](references/safety.md).

## Routing table

Mirrors `assets/command-index.yaml` (the contract `gauntlet guide` and
`gauntlet next` consume). Load exactly one reference per task intent.

| Task intent | Command family | Load only |
|---|---|---|
| initialize or inspect a project | `project` | [references/command-project.md](references/command-project.md) |
| create, validate, or freeze quality criteria | `spec` | [references/command-spec.md](references/command-spec.md) |
| choose a domain representation profile | `profile` | [references/command-project.md](references/command-project.md), then exactly one `references/profile-*.md` |
| start/resume/checkpoint a durable campaign | `campaign` | [references/command-campaign.md](references/command-campaign.md) |
| import traces or materialized observations | `observe` | [references/command-observe.md](references/command-observe.md) |
| localize failures and record diagnoses | `issue`, `counterexample`, `diagnosis` | [references/command-diagnose.md](references/command-diagnose.md) |
| inspect or decide write-ahead action intents | `intent` | [references/safety.md](references/safety.md) |
| fork and execute a controlled candidate | `experiment` | [references/command-experiment.md](references/command-experiment.md) |
| run search, calibration, or held-out evaluation | `evaluate` | [references/command-evaluate.md](references/command-evaluate.md) |
| accept a candidate into canonical local state | `promote` | [references/command-promote.md](references/command-promote.md) |
| publish, push, deploy, or otherwise affect the outside world | `release` | [references/command-release.md](references/command-release.md) |
| reconstruct or compare histories | `replay` | [references/command-replay.md](references/command-replay.md) |
| export/import OCI or portable evidence bundles | `bundle` | [references/command-bundle.md](references/command-bundle.md) |
| verify integrity, leakage, provenance, dependencies, or security | `audit` | [references/command-audit.md](references/command-audit.md) |
| generate, run, or heal durable declarative workflows | `workflow` | [references/workflows.md](references/workflows.md) |
| regenerate or verify committed JSON Schemas | `schema` | [references/contracts.md](references/contracts.md) |

Domain profile references (load exactly one, after `profile select`):
[software](references/profile-software.md) ·
[visual](references/profile-visual.md) ·
[research](references/profile-research.md) ·
[agent](references/profile-agent.md) ·
[model-training](references/profile-model-training.md)

Background guides (load on demand, never preemptively):
[architecture](references/architecture.md) ·
[method](references/method.md) ·
[contracts](references/contracts.md) ·
[safety](references/safety.md) ·
[integrations](references/integrations.md) ·
[workflows](references/workflows.md)

`gauntlet guide <topic>` resolves the same table from the CLI and rejects
anything not listed.

## Checkpoint and resume

Before a handoff, context compaction, or ending a session, run:

```bash
uv run --project <skill-root> gauntlet campaign checkpoint --json
```

This writes a compact, redacted handoff (objective, spec digest, stop rules,
branches, latest results, unresolved counterexamples, pending approvals,
legal next actions) to `.gauntlet/handoffs/` and the ledger. To resume in a
fresh context: `gauntlet campaign resume`, then `gauntlet next --json`.
Durable state is the memory; do not reconstruct state from conversation.

## Stop conditions

Stop (via `gauntlet campaign stop`) when any holds: all success conditions
met; hard budget exhausted; target reached; practical-improvement plateau;
evaluator disagreement above the calibrated threshold; current
representations cannot localize the failure; spec ambiguity yields materially
different valid outcomes; an unresolved critical issue blocks safe work;
cyclic repairs or evaluator gaming detected; explicit authorized stop. A hard
resource cap always applies. `gauntlet campaign status` shows progress
against every stop rule.

## Failure and escalation policy

Exit codes are stable: 0 ok · 2 invalid invocation/schema/config · 3 approval
required · 4 gate failed · 5 inconclusive (never promote) · 6 conflict ·
7 effect outcome unknown (reconcile) · 8 dependency unavailable ·
9 integrity/security violation. Full table:
[references/contracts.md](references/contracts.md).

On 3: surface the pending approval to the human; never infer approval
(`--non-interactive` fails instead). On 5: gather more evidence or stop; do
not round inconclusive into success. On 6: retry after the competing command
finishes, or run `gauntlet promote status`. On 7: run the family's
`reconcile` command; never manually retry a non-idempotent effect. On 9: stop
and run `gauntlet audit integrity`; escalate to the human. If the same repair
fails repeatedly, record the counterexample and stop the campaign rather
than looping.
