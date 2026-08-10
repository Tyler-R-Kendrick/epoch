# Model-training and autoresearch profile

## When to load this file

Load this reference after `gauntlet profile select model-training`, or
whenever a campaign runs training, fine-tuning, or systematic model
experiments. It is self-contained. The methodology generalizes the
strongest reusable parts of NVIDIA's NeMo RL Auto Research approach without
depending on NeMo.

## What the profile models

The profile configuration is `assets/profiles/model-training.yaml`
(`profile_id: profile:model-training`). The training recipe is canonical;
checkpoints, metrics, and job records are reproducible derivations and
observations bound to exact digests.

| Node | Role | Purpose |
|---|---|---|
| `training-recipe` | canonical | Config, launch command, hyperparameters — what a candidate edits. |
| `dataset-digests` | normative | Content digests per split; sealed promotion data invisible to search. |
| `baseline-record` | normative | The baseline run every candidate is compared against. Established first. |
| `environment-record` | derived | Lockfile/container/driver digests and allowlisted variables per run. |
| `checkpoint` | derived | Checkpoint digest bound to recipe, data, environment, seed. |
| `run-metrics` | observational | Spec-named authoritative metrics with sample counts and uncertainty. |
| `compute-job-records` | observational | Compute, memory, wall-clock, scheduler job IDs. |
| `outcome-record` | evaluative | keep \| discard \| crash \| inconclusive, with rationale. |
| `seam-routing-record` | evaluative | BLADE-style routing to harness/verifier/prompt/data/training seam. |
| `holdout-confirmation` | evaluative | Sealed held-out results required before promotion. |
| `trajectory-export` | derived | Optional state/action/observation/reward/next-state export with causal IDs. |

| Transform | What it protects |
|---|---|
| `edge:recipe-to-checkpoint` | Digests and seed recorded before launch; costly jobs need explicit approval. |
| `edge:checkpoint-to-metrics` | Spec-named harness; sample counts and uncertainty always recorded. |
| `edge:metrics-to-outcome` | Smoke runs cannot yield keep; crashes are recorded, never silently retried. |
| `edge:checkpoint-to-holdout` | Sealed promotion data never leaks into search or candidate worktrees. |
| `edge:runs-to-trajectories` | Only verified runs exported; causal IDs preserved. |

## Evaluator templates

- `metric-non-regression` (`evaluator:metric-non-regression`, L4) —
  candidate metrics versus the baseline record. Fails on protected-metric
  regression beyond declared budgets and on primary metrics that lack the
  sample size the spec's confidence policy requires.
- `smoke-vs-hypothesis-guard` (`evaluator:smoke-vs-hypothesis-guard`, L4) —
  refuses keep/discard outcomes derived from smoke-only or underpowered
  runs; such experiments may only be inconclusive.

## Pitfalls specific to this profile

- **Baseline first.** No search until the baseline run's recipe,
  checkpoint, environment, and metrics are recorded. One hypothesis and one
  Git branch per experiment.
- **No conclusions from underpowered smoke runs.** A smoke run validates
  the plumbing, not the hypothesis. Deciding keep/discard from it is the
  fastest way to accumulate false beliefs; the guard evaluator blocks it.
- **Explicit approval before costly jobs.** Local GPU, cluster, and cloud
  launches are effect-gated (`cost_class: costly-gpu`): propose the intent,
  get the approval, then launch. Never treat a missing approval as
  approval.
- **Failed branches are evidence.** Discarded and crashed experiments keep
  their branches, metrics, and job records; a discarded hypothesis prevents
  a repeat attempt only if its evidence survives.
- **Route the seam before fixing.** When a run fails, record a seam-routing
  diagnosis (harness, verifier, prompt, data, or training) before editing
  anything. Fixing the training config for a verifier bug corrupts every
  later comparison — never train around a harness defect.
- **Held-out confirmation before promotion.** Search metrics select
  candidates; only sealed held-out results promote them.

## Example spec fragment

```yaml
normative:
  hard_invariants:
    - baseline record exists before any experiment starts
    - promotion requires holdout-confirmation on sealed data
  target_dimensions:
    - primary-spec-metric
  protected_dimensions:
    - holdout-metric-non-regression
    - compute-budget-compliance
    - baseline-integrity
evaluators:
  hard:
    - evaluator:smoke-vs-hypothesis-guard
  deterministic:
    - evaluator:metric-non-regression
promotion:
  minimum_practical_effect: 0.005
  evidence_floor:
    - holdout-confirmation
search_space:
  legal_levers:
    - recipes/**
  frozen_surfaces:
    - .gauntlet/datasets/promotion/**
    - eval-harness/**
```

Typical flow: record the baseline → `gauntlet spec freeze` →
`gauntlet campaign start` → per hypothesis:
`gauntlet experiment propose` (approval gate for costly jobs) →
`gauntlet experiment fork/run/compare` → outcome keep/discard/crash/
inconclusive → `gauntlet evaluate promotion` on sealed data →
`gauntlet promote plan/apply`. Trajectory exports (for systems such as
Agent Lightning or NeMo Agent Toolkit) come only from verified campaigns.
