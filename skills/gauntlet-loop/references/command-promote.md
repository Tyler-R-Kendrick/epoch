# Command family: promote

## When to load this file

Load it to accept a confirmed candidate into canonical **local** project
state, to roll a promotion back, or to inspect settlement. Promotion never
pushes, publishes, deploys, or notifies — those are release effects (see
command-release.md).

## Prerequisites

- A kept candidate with passing held-out promotion evidence
  (`gauntlet evaluate promotion`).
- A conflict-free plan (`promote plan` verifies this before `apply`).

## Commands

```bash
uv run --project <skill-root> gauntlet promote plan
uv run --project <skill-root> gauntlet promote apply
uv run --project <skill-root> gauntlet promote rollback
uv run --project <skill-root> gauntlet promote status
```

- `plan` performs an ActiveGraph dry-run promotion, Git three-way
  applicability analysis (`git merge-tree`; the target branch is never
  mutated), frozen-surface diff, integrity checks, and the final evaluation
  at the **exact integration commit**. Evidence binds to that commit; a
  report generated later cannot substitute a different one.
- `apply` runs under the project lock as a fail-closed saga: stage →
  recheck preconditions → commit the intent → settle Git (a new auditable
  local promotion branch/commit), ActiveGraph (three-way state promotion,
  no semantic merge), artifacts, and the decision record in recorded order,
  appending an outcome after each step. If one store succeeds and another
  fails, completed reversible steps are compensated or the outcome is
  marked for reconciliation — cross-system atomicity is never claimed.
- `rollback` creates a new compensating candidate/commit and decision.
  History is never erased; there is no reset or destructive rewrite path.
- `status` reports graph, Git, artifact, and decision settlement per store.

## The decision order (fail-closed, lexicographic)

The kernel (`scripts/gauntlet/promotion.py`, itself a frozen surface —
changing it is an R4 `change-promotion-kernel` governance intent) evaluates
gates in this exact order; the first hard failure rejects, and missing or
uncertain evidence is inconclusive:

1. exact candidate and environment identity verified;
2. all hard invariants pass;
3. evidence/provenance floor complete;
4. no unresolved critical counterexample;
5. every protected dimension within its non-regression budget (upper CI);
6. target dimension exceeds the minimum practical effect (lower CI);
7. integration and sealed held-out sentinels pass;
8. evaluator leakage and self-modification checks pass;
9. ActiveGraph and Git promotion plans are conflict-free;
10. required approval/quorum satisfied.

There is structurally no weighted-average path: no gate produces a score
another gate can consume, so a correctness, security, or governance failure
can never be compensated by a big metric win.

## Durable outputs

- Ledger kind `promotions`: `PromotionPlanV1` and `PromotionDecisionV1`
  records binding the exact candidate commit and artifact digests tested,
  plus per-gate `GateCheckV1` results.
- The local promotion branch and commit.
- The applied ActiveGraph promotion outcome and
  `dev.gauntlet.promotion.accepted.v1` / `….rejected.v1` export events.

## Action and effect class

`plan` and `status` are R0. `apply` is R2
(`update-local-promotion-branch`, approval required) — expect exit 3 under
`--non-interactive` until the intent is approved. `rollback` is R2 for the
same reason. Effect class `reversible_with_cost` (a compensating commit is
always possible; erasing history is not offered).

## Failure and recovery

- Rejection (exit 4) names the failed gate; route the repair through a new
  diagnosis/experiment. Do not re-run `apply` hoping for drift.
- Inconclusive (exit 5): the candidate stays kept-but-unpromoted; gather
  evidence or stop.
- Conflict (exit 6): parent moved after the fork. Re-fork or rebase the
  experiment and re-confirm; `plan` reports the conflicting paths/entities
  without touching the target.
- A crash mid-`apply` leaves a recorded partial settlement: `promote
  status` shows which stores settled; the saga compensates or marks
  reconciliation — never re-apply blindly.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet promote plan --json
{
  "candidate": {"commit": "…", "branch": "gauntlet/campaign…/exp…"},
  "integration_commit": "…",
  "gates": [
    {"gate": "hard-invariants", "passed": true},
    {"gate": "protected-budgets", "passed": true},
    {"gate": "git-conflict-free", "passed": true}
  ],
  "verdict": "promotable",
  "would_create_branch": "gauntlet/promotion/…"
}
```

## External docs

- Git merge-tree: <https://git-scm.com/docs/git-merge-tree>
