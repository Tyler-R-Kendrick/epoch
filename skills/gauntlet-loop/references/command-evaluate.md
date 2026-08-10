# Command family: evaluate

## When to load this file

Load it to run search evaluation over candidates, calibrate evaluators, run
the sealed held-out promotion suite, or materialize an evaluation report.

## Prerequisites

- Evaluators declared in `.gauntlet/evaluators/` manifests
  (`dev.gauntlet.evaluator/v1`; templates ship in
  `assets/evaluator-templates/`).
- Disjoint split manifests under `.gauntlet/datasets/` (search /
  calibration / promotion).
- For `promotion`: a kept candidate and frozen evaluator versions.

## Commands

```bash
uv run --project <skill-root> gauntlet evaluate search
uv run --project <skill-root> gauntlet evaluate calibrate
uv run --project <skill-root> gauntlet evaluate promotion
uv run --project <skill-root> gauntlet evaluate report
```

- `search` runs only discovery/search cases visible to builders.
- `calibrate` validates deterministic and learned evaluators against
  known-good, known-bad, tie, and abstention examples, and measures order,
  verbosity, self-enhancement, and consistency bias for pairwise judges
  (blind identities, randomized order, ties and abstentions permitted, raw
  votes and disagreement preserved).
- `promotion` runs the held-out suite from a separate path unavailable to
  candidate builders, using the frozen evaluator versions. Candidates see
  only the manifest/digest and permitted aggregate outputs.
- `report` materializes observations and decision inputs without changing
  any result.

## The evaluation ladder

Cheapest trustworthy checks run first: structural/schema/digest checks →
deterministic local invariants → cross-representation and metamorphic
checks → reduced-fidelity execution → full-fidelity integration execution →
calibrated learned/LLM/human judgment. A persuasive learned judge can never
override a failed hard invariant.

## Evaluator contract

Evaluators declare their roles (invariant-checker, comparator, localizer,
diagnostician, adversary, integration-critic, meta-evaluator,
human-adjudicator) and independence level (L0 self-critique … L4
deterministic tool/independent human). Command evaluators run as argv
arrays in the candidate worktree with timeout, denied network, and an
allowlisted environment, and write structured output to
`.gauntlet-result.json` (`dev.gauntlet.evaluator-output/v1`). Log scraping
is opt-in through an explicit versioned parser, and the raw log digest is
always retained.

The evaluator that decides a candidate's promotion must not be modified by
that candidate. A campaign whose action seam is `evaluator` requires an
independent meta-evaluator and a separate governance campaign.

## Statistics

Paired designs with established libraries (`stats` extra: scipy/numpy):
exact tests for paired binary outcomes, confidence intervals for
continuous/ordinal deltas, bootstrap only with a recorded seed and enough
samples, multiple-comparison correction when configured, effect sizes and
practical thresholds rather than p-values alone. The conceptual gate:

```text
lower_confidence_bound(target_delta) > minimum_practical_effect
and upper_confidence_bound(regression_j) < allowed_budget_j  for every protected dimension j
```

Underpowered, noisy, missing, or contradictory evidence is **inconclusive**
(exit 5) and is never rounded into a promotion. Requesting a nontrivial
test without scipy installed is exit 8 — there is no hand-rolled fallback.

## Durable outputs

- `EvaluationResultV1` / `MetricResultV1` / `ComparisonV1` records bound to
  exact candidate and evaluator digests.
- Calibration records feeding evaluator trust decisions.
- Held-out results consumed by `gauntlet promote plan` (see
  command-promote.md).
- Raw evaluator stdout/stderr and result files stored as observational
  artifacts by digest.

## Action and effect class

`report` is R0. `search`, `calibrate`, and `promotion` are R1 when bounded
local (`run-bounded-local-evaluator`) and R2 with approval when declared
costly. Evaluator subprocesses run with denied network by default.

## Failure and recovery

- A hard-invariant failure is exit 4 with the violated invariant named;
  record the counterexample and route a repair — never weaken the
  invariant to pass (that is an R4 governance change).
- Inconclusive statistics are exit 5: add cases, increase power, or stop.
- Split overlap (a promotion case visible to search) is a leakage finding —
  exit 9; run `gauntlet audit leakage`.
- Evaluator crashes are recorded as observations, not silently retried.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet evaluate promotion --json
{
  "candidate": {"commit": "…"},
  "suite": "promotion",
  "evaluators": [{"id": "evaluator:parse-and-test", "frozen": true, "passed": true}],
  "target": {"metric": "test-pass-rate", "lcb": 0.021, "minimum_practical_effect": 0.0},
  "protected": [{"metric": "unrelated-test-pass-rate", "ucb": 0.0, "budget": 0.0}],
  "verdict": "pass"
}
```

## External docs

- SciPy statistical functions:
  <https://docs.scipy.org/doc/scipy/reference/stats.html>
