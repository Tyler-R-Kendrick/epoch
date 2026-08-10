# Default workflow templates

Bundled `WorkflowPlanV1` documents (`dev.gauntlet.workflow-plan/v1`) that seed
`.gauntlet/workflows/` in a project. Each plan is the typed source of truth
for one generated Microsoft Agent Framework declarative YAML file.

| Template | Purpose |
|---|---|
| `campaign-baseline.plan.json` | Full campaign loop: project doctor, spec validate, campaign start, experiment propose/fork/run, evaluate on the search and promotion splits, promote plan, promote apply (approval-gated). |
| `self-heal-repair.plan.json` | Repair loop: observe the failure, cluster the issue, record a diagnosis, propose/fork/run a repair experiment, evaluate, promote plan, promote apply (approval-gated). |

## Rules

- **Generation is deterministic.** `gauntlet workflow generate` renders one
  `<workflow_name>.yaml` per plan plus a `<workflow_name>.plan.json` sidecar.
  The same plan always produces byte-identical YAML, headed by a
  `# plan-digest: sha256:...` line binding the YAML to its plan.
- **YAML is derived, never edited.** Hand edits are detected as drift:
  `workflow validate` fails and `workflow sync` reports a conflict instead of
  overwriting. Change the plan, not the YAML.
- **Literal-only YAML.** No PowerFx `=` expressions (they require a dotnet
  runtime); retries, gating, and authority checks run inside the registered
  `gauntlet_step` Python tool.
- **Approval gates are defense in depth.** Steps with `require_approval` or
  action class R2+ get a `RequestExternalInput` action before them, and the
  step tool independently verifies a committed write-ahead intent; the
  gauntlet CLI enforces authority server-side regardless.
- **Self-healing goes through promotion.** `workflow heal` writes a
  structured patch proposal (for example, raising `max_retries` after exit 8)
  as an artifact; only a promoted plan — `parent_plan_digest` matching the
  deployed plan's digest — regenerates the YAML.
