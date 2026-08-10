# Benchmarks and evidence status

This file separates what has been measured in this repository from what is a
design target and from what upstream projects claim. Nothing here is
fabricated; anything unmeasured is labeled unmeasured.

## Measured: deterministic test/eval suite in this repository

Measured on 2026-08-06 on Linux (WSL2), Python 3.12, from the locked
environment (`uv sync --locked --all-extras`):

- `uv run pytest -q` — **769 tests collected, 769 passed, 0 failed**
  (~17 seconds wall clock).
- The suite spans `scripts/tests/unit/` (models, authority, intents,
  effects, beliefs, campaigns, experiments, gitops, evaluators, statistics,
  promotion, workflows, replay, traces, issues, counterexamples, artifacts,
  ActiveGraph pack, adapters, provenance/bundles, CloudEvents export),
  `scripts/tests/integration/` (Git conflict, workflow runtime),
  `scripts/tests/conformance/` (ActiveGraph contract), and
  `scripts/tests/adversarial/` (write-ahead enforcement, belief revocation).
- The suite is network-free and requires no API keys; vendor CLIs
  (LangSmith, ORAS, cosign) are exercised through recorded fixtures and
  injected fake process runners, not live services.

To reproduce:

```bash
cd skills/gauntlet-loop
uv sync --locked --all-extras
uv run pytest
```

Numbers above are valid for the working tree at the time of writing; rerun
against your exact commit before citing them elsewhere.

## Not measured: design targets

These are goals the implementation is built and tested toward, but no
benchmark result exists for them in this repository:

- Token/cost reduction from progressive disclosure (loading one reference
  per task instead of a monolithic handbook). No harness measurement has
  been recorded.
- Campaign-level outcome quality versus an unstructured builder/critic loop
  (higher repair acceptance rate, fewer regressions). The skill evals under
  `evals/` define trigger/non-trigger and task cases, but no baseline-vs-
  skill comparison run has been recorded here.
- Wall-clock overhead of the write-ahead authority protocol relative to
  direct execution. Not measured.

## Upstream-claimed (not verified here)

- ActiveGraph's replay/fork/promotion performance characteristics are the
  upstream project's own; this repository only verifies functional contract
  conformance (see `scripts/tests/conformance/`).
- Microsoft Agent Framework durable-workflow checkpoint/resume guarantees
  are upstream claims; this repository tests only the gauntlet-generated
  YAML round-trip and runtime integration in
  `scripts/tests/integration/test_workflow_runtime.py`.
- SciPy's statistical test correctness is trusted upstream; fixtures verify
  gauntlet's gating logic around it, not the library's numerics.

## Skipped optional integrations

No live LangSmith, OpenTelemetry collector, NeMo Relay, OCI registry, or
cosign signing runs were performed for this document. All corresponding code
paths run against fixtures/mocks in the measured suite above.
