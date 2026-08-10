# gauntlet-loop

An Agent Skill that turns an open-ended builder/critic loop into a bounded,
durable, auditable, counterexample-driven improvement system. The skill's
scripts are a deterministic control plane (no embedded LLM, no network in the
core loop) built on:

- [ActiveGraph](https://pypi.org/project/activegraph/) — event-sourced graph
  runtime: projection, replay, fork, structural diff, policy, and fail-closed
  promotion;
- Git worktrees and branches for isolated candidate experiments;
- a write-ahead authority protocol (R0–R4 action classes, votes, commits,
  effect settlement);
- an evaluation/promotion kernel with search/calibration/promotion split
  separation and hard non-regression budgets;
- Microsoft Agent Framework declarative (YAML) workflows for durable,
  self-healing orchestration of the loop itself.

The host agent proposes diagnoses, interventions, and candidates; the
`gauntlet` CLI validates, persists, authorizes, executes, compares, and
promotes them. Durable project state lives under a repository-level
`.gauntlet/` directory.

## Quickstart

```bash
cd skills/gauntlet-loop
uv sync --locked                 # install the locked environment
uv run gauntlet project init     # create <git-root>/.gauntlet/ from the template
uv run gauntlet next --json      # the state-driven "what do I do now" oracle
```

From anywhere in the repository the canonical invocation is:

```bash
uv run --project <skill-root> gauntlet <command> [options]
```

Every command supports `--json`, `--dry-run`, and `--non-interactive`, and
exits with a stable code (see [references/contracts.md](references/contracts.md)).

## Layout

| Path | Contents |
|---|---|
| [SKILL.md](SKILL.md) | The progressive-disclosure router agents load first. |
| `scripts/gauntlet/` | The `gauntlet` CLI and typed service layer. |
| `scripts/tests/` | Unit, integration, conformance, and adversarial suites. |
| `references/` | Direct references, one per command family or domain profile. |
| `assets/command-index.yaml` | Intent → command family → reference routing contract. |
| `assets/schemas/` | Committed JSON Schemas for the dev.gauntlet/v1 contract. |
| `assets/project-template/` | The `.gauntlet/` tree created by `gauntlet project init`. |
| `assets/profiles/`, `assets/evaluator-templates/` | Domain profiles and evaluator templates. |
| [`assets/workflows/`](assets/workflows/README.md) | Bundled `WorkflowPlanV1` workflow templates. |
| [`assets/examples/visual-semantic-mirror/`](assets/examples/visual-semantic-mirror/README.md) | Network-free chirality fixture. |
| `evals/` | Skill trigger/task evaluations and [rubrics](evals/rubrics/counterexample-quality.md) ([promotion discipline](evals/rubrics/promotion-discipline.md)). |

## Documentation

Start at [SKILL.md](SKILL.md); it routes to exactly one reference per task.
The full reference set:

- Background: [architecture](references/architecture.md) ·
  [method](references/method.md) · [contracts](references/contracts.md) ·
  [safety](references/safety.md) · [integrations](references/integrations.md)
- Command families: [project](references/command-project.md) ·
  [spec](references/command-spec.md) ·
  [campaign](references/command-campaign.md) ·
  [observe](references/command-observe.md) ·
  [diagnose](references/command-diagnose.md) ·
  [experiment](references/command-experiment.md) ·
  [evaluate](references/command-evaluate.md) ·
  [promote](references/command-promote.md) ·
  [release](references/command-release.md) ·
  [replay](references/command-replay.md) ·
  [bundle](references/command-bundle.md) ·
  [audit](references/command-audit.md) ·
  [workflows](references/workflows.md)
- Domain profiles: [software](references/profile-software.md) ·
  [visual](references/profile-visual.md) ·
  [research](references/profile-research.md) ·
  [agent](references/profile-agent.md) ·
  [model-training](references/profile-model-training.md)
- Project docs: [skill card](skill-card.md) ·
  [third-party dependencies](THIRD_PARTY.md) · [benchmarks](BENCHMARK.md)
- Project state template (the in-tree docs `gauntlet project init` copies):
  [.gauntlet](assets/project-template/.gauntlet/README.md) ·
  [artifacts](assets/project-template/.gauntlet/artifacts/README.md)
  ([blobs](assets/project-template/.gauntlet/artifacts/blobs/README.md),
  [staging](assets/project-template/.gauntlet/artifacts/staging/README.md)) ·
  datasets
  ([search](assets/project-template/.gauntlet/datasets/search/README.md),
  [calibration](assets/project-template/.gauntlet/datasets/calibration/README.md),
  [promotion](assets/project-template/.gauntlet/datasets/promotion/README.md),
  [sealed](assets/project-template/.gauntlet/datasets/promotion/sealed/README.md)) ·
  [state](assets/project-template/.gauntlet/state/README.md) ·
  [traces](assets/project-template/.gauntlet/traces/README.md) ·
  [runs](assets/project-template/.gauntlet/runs/README.md) ·
  [exports](assets/project-template/.gauntlet/exports/README.md) ·
  [cache](assets/project-template/.gauntlet/cache/README.md) ·
  [tmp](assets/project-template/.gauntlet/tmp/README.md) ·
  [locks](assets/project-template/.gauntlet/locks/README.md) ·
  [secrets](assets/project-template/.gauntlet/secrets/README.md)

## Development

```bash
uv sync --locked --all-extras
uv run ruff check .
uv run mypy
uv run pytest
```

The promotion kernel (`scripts/gauntlet/promotion.py`), authority engine
(`scripts/gauntlet/authority.py`), and effect executor
(`scripts/gauntlet/effects.py`) are frozen surfaces: changing them requires
an R4 governance intent, and candidates can never modify them.
