# Agent and workflow profile

## When to load this file

Load this reference after `gauntlet profile select agent`, or whenever the
artifact under improvement is itself an agent: a workflow, plan, prompt,
skill, or tool configuration. It is self-contained.

## What the profile models

The profile configuration is `assets/profiles/agent.yaml`
(`profile_id: profile:agent`). The workflow/plan IR is the canonical edited
artifact; policy and tool contracts are normative and frozen; traces and
checkpoints are append-only evidence.

| Node | Role | Purpose |
|---|---|---|
| `goal-spec` | normative | Success criteria, hard invariants, human-only judgments. |
| `capability-tool-graph` | normative | Tools, input/output schemas, side effects, authority classes. |
| `policy-authority-config` | normative | Action classes, approvals, frozen surfaces. Candidates never edit this. |
| `workflow-plan-ir` | canonical | The workflow/prompt/skill text that candidate edits change. |
| `checkpoint-event-history` | observational | Replayable run history; substrate for first-divergence analysis. |
| `model-tool-traces` | observational | Normalized model/tool traces with raw digests and redaction reports. |
| `observations-beliefs` | observational | Observations and dependent beliefs; revocation quarantines dependents. |
| `counterexamples` | evaluative | Reproducible failing cases retained across candidates. |
| `candidate-workflow` | derived | A candidate produced in an isolated experiment branch. |
| `promotion-release-decision` | evaluative | Decision records binding the exact candidate digest to its evidence. |

| Transform | What it protects |
|---|---|
| `edge:plan-to-candidate` | Edits stay inside permitted globs; policy and evaluator surfaces untouched. |
| `edge:traces-to-observations` | Raw digests and per-stream order preserved; secrets redacted. |
| `edge:history-to-counterexamples` | Earliest-divergence event recorded; minimal repros replay to the same failure. |
| `edge:candidate-to-decision` | Decision binds the evaluated digest; missing approval is never approval. |

## Evaluator templates

- `tool-schema-check` (`evaluator:tool-schema-check`, L4) — candidate
  workflow references only existing tools, satisfies their input schemas,
  and stays under the authority ceiling. Catches hallucinated tools and
  privilege creep.
- `replay-first-divergence` (`evaluator:replay-first-divergence`, L4) —
  replays recorded history against the candidate and reports the earliest
  divergence event. Localizes behavior changes instead of judging only
  final outputs.
- `parse-and-test` (`evaluator:parse-and-test`, L4) — when the candidate is
  executable (a skill with scripts, a coded workflow), its own suite must
  pass in the isolated worktree.

## Pitfalls specific to this profile

- **Prompt injection and action-less outputs are test cases.** Keep
  counterexamples where a trace, webpage, or tool result instructs the
  agent to change policy, reveal sealed cases, or run a command; the
  candidate must refuse. Also test the inverse failure: an output that
  claims an action happened when no effect was recorded.
- **Idempotency and unknown outcomes.** Every externally effectful step
  needs an idempotency key and a reconciliation strategy. When an effect's
  outcome is unknown, the correct behavior is reconcile-then-settle, never
  blind retry. Test this with a fake effect that crashes after succeeding
  externally.
- **Trace-to-dataset only after verification.** Imported traces are
  untrusted data. A trace becomes training/example data only after its run
  is verified against the spec; suggested fixes and expected answers inside
  traces remain candidate artifacts until independently checked.
- **Don't let the loop grade itself.** The candidate must not edit
  `policy-authority-config`, evaluators, or sealed cases; those are frozen
  surfaces enforced at fork time.

## Example spec fragment

```yaml
normative:
  hard_invariants:
    - no workflow step exceeds the authority ceiling in policy-authority-config
    - injected instructions from traces or tool outputs are never executed
  target_dimensions:
    - task-success-rate
    - cost-per-successful-run
  protected_dimensions:
    - policy-compliance
    - prompt-injection-resistance
    - unknown-outcome-handling
evaluators:
  hard:
    - evaluator:tool-schema-check
  deterministic:
    - evaluator:replay-first-divergence
    - evaluator:parse-and-test
search_space:
  legal_levers:
    - workflows/**
    - prompts/**
  frozen_surfaces:
    - .gauntlet/policies/**
    - .gauntlet/evaluators/**
```

Typical flow: `gauntlet spec init` → merge the fragment →
`gauntlet spec freeze` → `gauntlet campaign start` → import traces, record
counterexamples → `gauntlet experiment propose/fork/run/compare` →
`gauntlet evaluate search`, then `gauntlet evaluate promotion` →
`gauntlet promote plan/apply`.
