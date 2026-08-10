# Command family: spec

## When to load this file

Load it to create, validate, freeze, compare, or supersede the quality
criteria that gate a campaign. No ordinary campaign may run without a frozen
spec and a baseline.

## Prerequisites

- An initialized project (`gauntlet project init`).
- Ideally a selected profile first (`gauntlet profile select`), so profile
  defaults are already merged into the draft.

## Commands

```bash
uv run --project <skill-root> gauntlet spec init [--force]
uv run --project <skill-root> gauntlet spec validate
uv run --project <skill-root> gauntlet spec freeze [--dry-run]
uv run --project <skill-root> gauntlet spec diff <old-digest> <new-digest>
uv run --project <skill-root> gauntlet spec supersede [--governance-decision <id>]
```

- `init` copies the documented draft to `.gauntlet/spec/gauntlet.yaml`
  without declaring it frozen. `--force` restores the template over an
  existing draft.
- `validate` performs schema, cross-reference, evaluator, split,
  effect-policy, and representation-graph validation. It refuses a
  promotable campaign until the spec supplies domain-meaningful target
  thresholds and protected regression budgets — `null` is never silently
  treated as zero or success.
- `freeze` canonicalizes (RFC 8785) and digests the complete bundle: the
  spec document, reference manifest, policies, profiles, evaluator
  manifests, and data split manifests. It records the member digests under
  `.gauntlet/spec/digests/` and emits a `dev.gauntlet.spec.frozen.v1` event.
  `--dry-run` shows the member digests without freezing.
- `diff` explains member-level semantic and digest changes between two
  frozen versions.
- `supersede` creates a new spec version through an R4 governance intent; a
  frozen version is never rewritten in place. Without a recorded governance
  decision it fails closed with exit code 3.

## Input template

Edit `.gauntlet/spec/gauntlet.yaml` (schema `dev.gauntlet.spec/v1`). The
sections you must fill before `validate` passes for a promotable campaign:

```yaml
goal:            # statement, deliverables, non_goals
normative:       # hard_invariants, target_dimensions, protected_dimensions,
                 # human_only_judgments
reference_pack:  # manifest, examples, provenance_and_rights_required
search_space:    # legal_levers, frozen_surfaces, candidate_budget
representations: # nodes, transforms, required_consistency_relations
evaluators:      # hard, deterministic, simulators, learned, llm_judges, human
splits:          # search/calibration/promotion manifests (disjoint)
promotion:       # minimum_practical_effect, protected_regression_budgets,
                 # confidence_policy, evidence_floor, required_approvals
runtime:         # authority_ceiling, allowed_capabilities, effect_policy
stop:            # hard_budget, target_condition, plateau_policy, thresholds
```

## Durable outputs

- `.gauntlet/spec/gauntlet.yaml` (tracked draft, then frozen marker).
- `.gauntlet/spec/digests/` — per-member and bundle digests per frozen
  version.
- A frozen-spec event in the ActiveGraph store; the frozen digest is what
  campaigns, experiments, and promotion decisions bind to.

## Action and effect class

`validate` and `diff` are R0. `init` and `freeze` are R1 (project lock,
local reversible writes). `supersede` is R4 governance
(`change-frozen-spec`) — always gated, never automatic.

## Failure and recovery

- `validate` failure exits 4 with a structured error list; fix the draft and
  rerun. Nothing is mutated.
- `freeze` on an invalid spec fails; freeze implies a passing validation.
- `supersede` without governance authority exits 3. Record the governance
  decision first (see the intent commands in safety.md), then rerun with
  `--governance-decision <id>`.
- A stale frozen digest elsewhere (campaign or intent pinned to an old spec)
  is rejected by those commands, not patched silently.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet spec freeze --json
{
  "frozen_digest": "sha256:…",
  "members": {
    "spec": "sha256:…",
    "policies/authority.yaml": "sha256:…",
    "evaluators/manifest.yaml": "sha256:…"
  }
}
```

## External docs

- RFC 8785 (JSON Canonicalization Scheme):
  <https://www.rfc-editor.org/rfc/rfc8785>
- JSON Schema Draft 2020-12: <https://json-schema.org/specification>
