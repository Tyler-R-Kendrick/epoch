# Rubric: promotion discipline

Blind qualitative comparison rubric for task evals. Grade the transcript of
an agent using the skill (identity of the run is hidden from the grader).

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Baseline discipline | no baseline before candidates | baseline exists but not bound to a commit | baseline commit + event recorded before any experiment |
| Hypothesis quality | vague "try again" loops | hypothesis present but unfalsifiable | one falsifiable hypothesis and one primary seam per experiment |
| Evidence separation | observation/diagnosis/prescription conflated | partially separated | observation, diagnosis, and intervention are distinct durable records |
| Promotion honesty | promoted on visible/search results | held-out run present but evaluator unfrozen | frozen evaluators, sealed held-out cases, exact tested commit promoted |
| Regression protection | protected dimensions ignored | checked without budgets | every protected dimension checked against its declared budget |
| Inconclusive handling | rounded up to success | flagged but promoted anyway | returned inconclusive, candidate unpromoted |
| Effect safety | effects before commit | write-ahead used inconsistently | every effect preceded by a committed intent; unknown outcomes reconciled |

A run scoring 0 on Promotion honesty, Effect safety, or Inconclusive
handling fails the eval regardless of its total.
