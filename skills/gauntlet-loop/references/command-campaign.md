# Command family: campaign

## When to load this file

Load it to start, resume, checkpoint, inspect, or stop a durable improvement
campaign — the bounded container for every experiment, evaluation, and
promotion.

## Prerequisites

- A frozen spec (`gauntlet spec freeze`). A campaign without a frozen spec
  is refused, unless it is explicitly a spec-discovery campaign whose
  outputs cannot be promoted into product state.
- An authoritative baseline (branch/commit) to compare candidates against.

## Commands

```bash
uv run --project <skill-root> gauntlet campaign start
uv run --project <skill-root> gauntlet campaign resume
uv run --project <skill-root> gauntlet campaign checkpoint
uv run --project <skill-root> gauntlet campaign status
uv run --project <skill-root> gauntlet campaign stop
```

- `start` requires the frozen spec digest, an explicit budget and stop
  rules, the baseline, and the target branch/commit. It creates the
  campaign record and activates the campaign state machine
  (`draft → active → checkpointed → stopped`).
- `resume` reloads durable state and the latest sanitized handoff — the
  supported way to continue in a fresh context. Follow it with
  `gauntlet next --json`.
- `checkpoint` writes a compact, redacted handoff: objective, spec digest,
  stop rules, current branches, latest accepted and rejected results,
  unresolved counterexamples, pending approvals, and legal next actions.
  Run it before any handoff, context compaction, or session end.
- `status` reports progress against **all** stop conditions without
  mutation.
- `stop` records a semantic or resource stop reason (one of the closed
  `StopReason` values, e.g. `budget-exhausted`, `plateau`,
  `evaluator-disagreement`, `cyclic-repair-or-gaming`) and prevents further
  experiments unless the campaign is explicitly reopened.

## Durable outputs

- Ledger kind `campaigns`: immutable revision records
  `<campaign-id>.rev-<n>.json` — every state transition appends a new
  revision; the highest revision is current. Never edit these by hand.
- `.gauntlet/handoffs/` — redacted `HandoffV1` checkpoint files (tracked),
  mirrored into the ledger for portability.
- Campaign lifecycle events in the ActiveGraph store.

## Action and effect class

`status` is R0. `start`, `resume`, `checkpoint`, and `stop` are R1
(`write-gauntlet-state`; project lock; local reversible writes). Effect
class `reversible`. Costly experiment execution inside the campaign is a
separate R2 concern (see command-experiment.md).

## Failure and recovery

- `start` without a frozen spec or baseline exits 4 and names the missing
  precondition (`gauntlet next` will already have routed you to the spec
  family in that case).
- A crash mid-campaign loses nothing: state is ledger revisions plus the
  event store. `resume` re-derives the current state; `gauntlet replay
  rebuild` can verify it.
- Concurrent campaign mutation is prevented by the project lock (exit 6 on
  timeout).
- `stop` is not destructive: branches, worktrees, evidence, and ledger
  records all remain; only new experiments are blocked.

## Stop discipline

A hard resource cap is always enforced even when semantic stop rules are
configured. If `status` shows any stop condition met, stop — do not keep
iterating "one more candidate" past a recorded budget.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet campaign status --json
{
  "campaign_id": "campaign:2026-08-06-fix-parser",
  "state": "active",
  "spec_digest": "sha256:…",
  "baseline": {"branch": "main", "commit": "…"},
  "budget": {"spent": {"experiments": 3}, "limits": {"experiments": 10}},
  "stop_conditions": [{"reason": "plateau", "met": false}],
  "unresolved_counterexamples": ["counterexample:…"]
}
```

## External docs

None required; this family is entirely local.
