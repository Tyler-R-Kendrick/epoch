# Skill card: gauntlet-loop

**Contract:** `dev.gauntlet/v1` · **Version:** 0.1.0 · **License:** MIT

## Purpose

Run spec-grounded, counterexample-driven improvement campaigns over code,
agents, research documents, and multimodal artifacts. The skill replaces
"ask the model to try again" with a control and evidence protocol: frozen
specification, materialized candidates, independent evaluators, write-ahead
authorization, held-out promotion, and separately authorized release.

## Inputs

- A Git repository (the project) and a frozen `GauntletSpecV1` under
  `.gauntlet/spec/` naming hard invariants, target and protected dimensions,
  legal levers, frozen surfaces, splits, budgets, and stop rules.
- Host-agent proposals as structured records: diagnoses (falsifiable, with a
  falsifier), interventions (one action seam, smallest mutation surface),
  candidate edits inside a permitted worktree, evaluator rubrics.
- Raw evidence: local observations, generic JSONL traces, and optional
  LangSmith / OpenTelemetry / NeMo ATOF imports (observational only).

## Outputs

- Durable project state under `<git-root>/.gauntlet/`: tracked spec, policy,
  schema, evaluator, counterexample, and one-record-per-file ledger
  documents; ignored ActiveGraph store, traces, blobs, and sealed cases.
- Candidate Git branches (`gauntlet/<campaign>/<experiment>`) with external
  worktrees; local promotion branches/commits for accepted candidates.
- Evaluation results, paired comparisons, promotion/release decisions,
  redacted handoffs, replay records, and self-verifying evidence bundles
  (optionally pushed via ORAS, optionally signed via cosign).
- Generated Microsoft Agent Framework declarative workflow YAML under
  `.gauntlet/workflows/`, derived deterministically from `WorkflowPlanV1`.

## Authority classes

ActiveGraph's closed R0–R4 vocabulary, fail-closed, default ceiling R1:

| Class | Meaning | Approval |
|---|---|---|
| R0 | Pure inspection/deterministic computation | automatic |
| R1 | Local, bounded, reversible project/candidate state | automatic (≤ ceiling) |
| R2 | Costly experiments, dependency installs, local promotion branch | approval required |
| R3 | Outward effects: push, publish, deploy, send, shared memory | human approval, always |
| R4 | Governance: authority policy, promotion kernel, sealed suite, frozen spec, trust roots | governance gate, always |

Effect classes are orthogonal (`pure`, `read_only`,
`idempotent_known_outcome`, `bufferable`, `reversible`,
`reversible_with_cost`, `irreversible_gated`, `unknown`); unknown outcomes
reconcile and are never auto-retried when non-idempotent.

## Stop conditions

Success conditions met; hard budget exhausted; target reached; plateau;
evaluator disagreement above threshold; representation gap; spec ambiguity;
unresolved critical issue; cyclic repair or evaluator gaming; explicit
authorized stop. A hard resource cap always applies even when semantic
stopping is configured.

## Evaluation summary

Cheapest-trustworthy-first ladder: structural/schema/digest checks →
deterministic invariants → cross-representation/metamorphic checks →
reduced-fidelity execution → full integration execution → calibrated
learned/LLM/human judgment. Evaluators declare roles and independence
(L0–L4). Search, calibration, and promotion splits stay disjoint; the
promotion suite is sealed from candidate builders. Promotion is
lexicographic and fail-closed — no weighted average can compensate for a
correctness, security, or governance failure — and inconclusive evidence
(exit code 5) is never promoted.

## Known limitations

- Candidate isolation is process discipline (scrubbed allowlisted
  environment, argv-array execution, policy-level network denial), not an OS
  sandbox or cryptographic secrecy. The stronger isolation mode uses
  separate CI/runner credentials and storage for the sealed suite.
- Git, ActiveGraph, artifact storage, and external registries cannot share
  one atomic transaction; promotion/release settle through a recorded saga
  with compensation and reconciliation, not cross-system atomicity.
- `gauntlet next` is advisory navigation computed from durable state; it
  does not replace policy enforcement, which happens on each command.
- Forked counterfactual replays improve causal attribution but do not prove
  causality when environment, hidden model state, or evaluators are not
  controlled.
- Optional integrations (LangSmith, OTel, ATOF, ORAS, cosign, workflows
  runtime) degrade to clear exit-code-8 failures when not installed; the
  core loop is network-free and needs no API keys.
