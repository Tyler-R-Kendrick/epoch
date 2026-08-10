# Software profile

## When to load this file

Load this reference after `gauntlet profile select software`, or whenever a
campaign edits a source tree that is built, tested, and promoted as Git
commits. It is self-contained: you do not need any other reference open to
use it.

## What the profile models

The profile configuration is `assets/profiles/software.yaml`
(`profile_id: profile:software`). The source tree at an exact Git commit is
the only canonical node; everything else is regenerated from it or observed
around it.

| Node | Role | Purpose |
|---|---|---|
| `requirements-spec` | normative | Requirements; source of hard invariants and targets. |
| `source-tree` | canonical | The edited artifact, pinned to a Git commit. |
| `architecture-graph` | derived | Module/dependency graph; exposes layering violations. |
| `api-schema-ir` | derived | Public API/schema IR for baseline-vs-candidate comparison. |
| `data-migration-model` | derived | Data model and migration ordering; exposes destructive migrations. |
| `compiled-package` | derived | Build artifact with recorded provenance digests. |
| `test-fixtures` | evaluative | Unit/property/integration/fuzz fixtures and their seeds. |
| `runtime-traces` | observational | Latency/throughput/resource distributions, cold and warm. |
| `security-reports` | evaluative | Verbatim scanner output (dependency audit, secret scan). |

| Transform | What it protects |
|---|---|
| `edge:source-to-architecture-graph` | Every graph edge maps back to a real import/link. |
| `edge:source-to-api-ir` | Deterministic regeneration; baseline public surface. |
| `edge:source-to-build` | Runtime data files ship; source/compiled test equivalence. |
| `edge:build-to-runtime-traces` | Runs record artifact digest, environment digest, seed. |
| `edge:source-to-security-reports` | Findings are recorded, never edited or fabricated. |

## Evaluator templates

Declared in the profile and shipped under `assets/evaluator-templates/`:

- `parse-and-test` (`evaluator:parse-and-test`) — runs `python -m pytest -q`
  in the candidate worktree; the L4 gate for behavior. Catches regressions
  in the candidate's own suite, including unrelated tests you were supposed
  to preserve.
- `build-check` (`evaluator:build-check`) — parse/compile gate; catches
  candidates that do not even build before costlier evaluators run.
- `api-compatibility` (`evaluator:api-compatibility`) — diffs candidate
  API/schema IR against the baseline IR; catches undeclared breaking
  changes to the public surface.

Measure correctness before performance. When performance is a target,
record latency/throughput/resource *distributions* (with cold and warm
measurements where relevant), not one headline number.

## Pitfalls specific to this profile

- **Preserve unrelated work.** A candidate that fixes the target defect but
  breaks or deletes unrelated code/tests fails, regardless of the target
  metric. `unrelated-test-pass-rate` is a default protected dimension.
- **Minimize patches.** Keep the candidate diff inside the experiment's
  permitted globs; drive-by refactors make first-divergence analysis and
  review useless.
- **Test the exact integration commit.** Evidence binds to a commit digest.
  If `gauntlet promote plan` produces a merge/integration commit, run the
  frozen evaluators against that commit, not the pre-merge branch tip.
- **Never train or prompt around a harness defect.** If the test harness is
  wrong, route the fix to the harness seam through a recorded diagnosis and
  intervention; do not craft candidates that exploit the defect.

## Example spec fragment

Merge into `.gauntlet/spec/gauntlet.yaml` (then `gauntlet spec validate`
and `gauntlet spec freeze`):

```yaml
normative:
  hard_invariants:
    - all baseline tests pass at the integration commit
    - public API surface is backward compatible unless the spec declares a break
  target_dimensions:
    - test-pass-rate
    - open-counterexample-count
  protected_dimensions:
    - public-api-compatibility
    - unrelated-test-pass-rate
    - security-finding-count
evaluators:
  hard:
    - evaluator:build-check
    - evaluator:parse-and-test
  deterministic:
    - evaluator:api-compatibility
search_space:
  legal_levers:
    - src/**
  frozen_surfaces:
    - .gauntlet/evaluators/**
    - tests/contract/**
```

Typical flow: `gauntlet campaign start` → `gauntlet experiment propose` →
`gauntlet experiment fork` → edit → `gauntlet experiment run` →
`gauntlet experiment compare` → `gauntlet evaluate promotion` →
`gauntlet promote plan` → `gauntlet promote apply`.
