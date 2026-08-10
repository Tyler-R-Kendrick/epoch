# Command family: experiment

## When to load this file

Load it to test a diagnosis with a controlled counterfactual: fork an
isolated candidate, execute declared commands, and compare paired outcomes
against the baseline.

## Prerequisites

- An active campaign with a frozen spec and baseline.
- A recorded diagnosis and intervention naming one action seam (see
  command-diagnose.md).

## Commands

```bash
uv run --project <skill-root> gauntlet experiment propose
uv run --project <skill-root> gauntlet experiment fork
uv run --project <skill-root> gauntlet experiment run
uv run --project <skill-root> gauntlet experiment compare
uv run --project <skill-root> gauntlet experiment keep
uv run --project <skill-root> gauntlet experiment discard
uv run --project <skill-root> gauntlet experiment archive
```

- `propose` requires exactly one falsifiable hypothesis (statement +
  falsifier) bound to one primary action seam, and the smallest plausible
  mutation surface: `permitted_globs` is mandatory. Declared search cases,
  protected dimensions, budget, and timeout are recorded up front.
- `fork` creates the candidate: an ActiveGraph fork at a recorded event plus
  a Git branch `gauntlet/<campaign-id>/<experiment-slug>` from the recorded
  parent commit, checked out in an **external worktree** (outside the main
  worktree, under the configured sibling worktree root). It refuses to fork
  from a dirty overlapping worktree unless a clean external worktree can
  isolate the experiment.
- Edit only inside the worktree and only within `permitted_globs`. The
  candidate diff is validated against permitted globs and frozen surfaces
  both before execution and after (actual diff); violations fail closed
  with counterexample-ready detail.
- `run` executes **only** the declared argv commands in the candidate
  worktree with a scrubbed, allowlisted environment. Network denial is
  policy-level (`GAUNTLET_NETWORK=deny`, no proxy/credential variables) —
  documented discipline, not an OS sandbox. Exact commands, cwd, versions,
  inputs, outputs, resource use, and exit status are captured; raw outputs
  become observational artifacts by digest.
- `compare` produces paired deltas, confidence bounds, Pareto/non-dominance
  information, counterexample changes (fixed/retained/introduced), and
  protected-dimension regressions against the baseline.
- `keep` retains the candidate **for held-out confirmation** — it never
  promotes. `discard` preserves the branch, logs, reason, and evidence.
  `archive` maintains a quality-diversity/Pareto archive indexed by
  configured behavior descriptors.

## Status vocabulary

Every run status is one of `proposed | blocked | running | keep | discard |
crash | inconclusive | superseded`. A tiny smoke run is a plumbing check:
it can never conclude keep/discard on a scientific or optimization
hypothesis (enforced; see the `smoke-vs-hypothesis-guard` evaluator
template).

## Durable outputs

- Ledger kind `experiments`: immutable revisions
  `<experiment-id>.rev-<n>.json` capturing baseline, exact fork point,
  hypothesis and seam, permitted files and frozen surfaces, branch/worktree
  manifest and commits, commands/environment/seeds/versions, resource
  usage, observation references, paired comparison, counterexample changes,
  and the outcome rationale.
- Tracked worktree manifest `<id>.json` (branch, commit, parent, sanitized
  workspace ID) in `.gauntlet/workspace-manifests/`; the absolute local
  path lives only in the ignored `<id>.local.json`.
- The candidate Git branch and its commits (rejected and crashed branches
  are retained as evidence unless an explicit retention policy removes them
  after bundling).
- `dev.gauntlet.experiment.completed.v1` export events.

## Action and effect class

`propose`, `fork`, worktree edits, and bounded local runs are R1
(`edit-candidate-worktree`, `run-bounded-local-evaluator`). A costly run
(`run-costly-experiment`) is R2 and requires approval — expect exit 3 in
`--non-interactive` mode until the intent is approved. `compare` is R0.
Effect classes are `reversible` for candidate state; declared commands run
with `deny` network by default.

## Failure and recovery

- A frozen-surface or permitted-glob violation fails closed (exit 4 or 9)
  and produces a security counterexample; the candidate cannot approve its
  own violation away.
- `crash` is a recorded outcome, not a lost run; the branch and logs
  remain. Rerun with the same declared commands or supersede the
  experiment.
- Worktree removal only happens through `git worktree remove`/`prune`,
  after proving the worktree belongs to this project. Never delete worktree
  paths manually.
- Git conflicts at fork time exit 6; pick a clean parent commit or resolve
  the dirty state first (without stashing unrelated user work — the runner
  refuses destructive Git subcommands entirely).

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet experiment compare --json
{
  "experiment_id": "experiment:…",
  "baseline": {"commit": "…"},
  "candidate": {"commit": "…"},
  "deltas": [{"metric": "test-pass-rate", "delta": 0.04, "ci": [0.01, 0.07]}],
  "protected": [{"metric": "unrelated-test-pass-rate", "regression": false}],
  "counterexamples": {"fixed": ["…"], "introduced": []},
  "status": "keep"
}
```

## External docs

- Git worktrees: <https://git-scm.com/docs/git-worktree>
- Git merge-tree (three-way applicability):
  <https://git-scm.com/docs/git-merge-tree>
