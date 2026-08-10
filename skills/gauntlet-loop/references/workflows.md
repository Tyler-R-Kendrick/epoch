# Command family: workflow

## When to load this file

Load it to generate, validate, run, resume, or heal the durable declarative
workflows that orchestrate gauntlet loops: Microsoft Agent Framework (MAF)
declarative YAML files stored in `.gauntlet/workflows/`, generated
deterministically from typed `WorkflowPlanV1` documents.

## Prerequisites

- The `workflows` extra: `uv sync --locked --extra workflows` (installs
  `agent-framework-declarative`; see integrations.md). Missing extra is
  exit 8 with guidance.
- An initialized project. Bundled starter plans ship in
  `assets/workflows/` (`campaign-baseline.plan.json` — the full campaign
  loop, and `self-heal-repair.plan.json` — the failure-to-repair loop).

## Commands

```bash
uv run --project <skill-root> gauntlet workflow generate
uv run --project <skill-root> gauntlet workflow sync
uv run --project <skill-root> gauntlet workflow status
uv run --project <skill-root> gauntlet workflow validate
uv run --project <skill-root> gauntlet workflow run
uv run --project <skill-root> gauntlet workflow resume
uv run --project <skill-root> gauntlet workflow heal
```

- `generate` renders one `<name>.yaml` per plan plus a `<name>.plan.json`
  sidecar (the canonical plan) into `.gauntlet/workflows/`. Generation is
  deterministic: the same plan always produces byte-identical YAML (stable
  key order, no timestamps in the body), headed by a
  `# plan-digest: sha256:…` line binding the YAML to its plan's canonical
  JSON. Lineage is enforced: a plan whose `parent_plan_digest` does not
  match the currently deployed plan is refused outside the promote path.
- `sync` reconciles plans and generated YAML, reporting drift as a conflict
  instead of overwriting.
- `status` reports deployed plans, digests, drift, and run/checkpoint
  state.
- `validate` fails on any drift (hand-edited YAML), digest mismatch, or
  plan-schema violation.
- `run` executes a workflow through the MAF declarative runtime with
  durable checkpoints; `resume` continues from the latest checkpoint after
  an interruption, approval wait, or session end.
- `heal` turns a recorded failure into a structured plan patch written as a
  **proposal** artifact under `.gauntlet/workflows/proposals/` (for
  example, raising `max_retries` for a step that failed with exit 8).

## Design rules (what keeps this safe)

- **YAML is derived, never edited.** The plan is the source of truth; hand
  edits are drift, detected and refused. Change the plan, regenerate.
- **Literal-only YAML.** No PowerFx `=` expressions anywhere (they require
  a dotnet runtime); the Python control plane is the single source of data
  flow, and generation refuses any literal starting with `=`. Retries,
  gating, and authority checks run inside the registered `gauntlet_step`
  Python tool.
- **Approval gates are defense in depth.** Steps marked `require_approval`
  or classed R2+ get a `RequestExternalInput` action before them, so a
  human can approve/deny inside the durable run — and the step tool
  independently verifies a committed write-ahead intent, and the gauntlet
  CLI enforces authority server-side regardless. The workflow layer can
  therefore never be the only gate.
- **Self-healing goes through promotion.** `heal` proposes; the gauntlet
  experiment/evaluate/promote loop decides. Failures become counterexamples
  like any other evidence, distilled repairs update the plan, and only a
  promoted plan (with `parent_plan_digest` matching the deployed plan's
  digest) regenerates YAML — via the promote path's `force_promoted`
  lineage override. The workflow never autonomously rewrites itself.

## Durable outputs

- `.gauntlet/workflows/<name>.yaml` + `<name>.plan.json` (tracked, derived
  + canonical pair).
- `.gauntlet/workflows/proposals/` — heal proposals awaiting the
  experiment/promotion loop.
- MAF runtime checkpoints for resumable runs.
- Ledger/graph records for run outcomes; failed steps produce observations
  and counterexamples that feed command-diagnose.md flows.

## Action and effect class

`status` and `validate` are R0. `generate`, `sync`, and `heal` are R1 local
writes (project lock held by the CLI layer, not the service). `run` and
`resume` execute whatever the plan's steps declare — each step's own action
class governs; steps that reach R2+ block on their approval gates. The
workflow runtime itself performs no outward effects beyond its steps.

## Failure and recovery

- Drift (hand-edited YAML): `validate` exits 4, `sync` reports the
  conflict. Recover by regenerating from the plan (intentional changes go
  through a plan patch + promotion).
- A failed step run: the failure is recorded; run `gauntlet workflow heal`
  to draft the repair proposal, then route it through
  experiment/evaluate/promote.
- Interrupted `run`: `resume` continues from the durable checkpoint; no
  step re-executes outside its idempotency/effect contract.
- Plan lineage mismatch (stale `parent_plan_digest`): exit 4; rebase the
  proposal onto the currently deployed plan.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet workflow status --json
{
  "workflows": [
    {
      "name": "campaign-baseline",
      "plan_digest": "sha256:…",
      "yaml_digest": "sha256:…",
      "drift": false,
      "last_run": {"state": "waiting_approval", "checkpoint": "…"}
    }
  ],
  "proposals": []
}
```

## External docs

- Microsoft Agent Framework:
  <https://learn.microsoft.com/en-us/agent-framework/>
- agent-framework-declarative on PyPI:
  <https://pypi.org/project/agent-framework-declarative/>
