# Third-party dependencies

Generated from `pyproject.toml` and the committed `uv.lock`. Versions are the
exact lock resolutions at the time of writing; licenses were read from each
installed package's metadata. Re-verify after any `uv lock` update.

## Core runtime dependencies

| Package | Locked version | Role | License | Link |
|---|---|---|---|---|
| activegraph | 1.10.0 | Event-sourced graph runtime: objects/relations, packs, behaviors, policies, replay, fork, structural diff, fail-closed R0–R4 authority and promotion. The single scheduler/event store; gauntlet never reimplements it. | Apache-2.0 | <https://pypi.org/project/activegraph/> |
| click | 8.4.2 | CLI framework for the `gauntlet` entry point. | BSD-3-Clause | <https://pypi.org/project/click/> |
| pydantic | 2.13.4 | Strict v2 models for every persisted dev.gauntlet/v1 contract; JSON Schema (Draft 2020-12) generation. | MIT | <https://pypi.org/project/pydantic/> |
| pyyaml | 6.0.3 | Safe YAML loading for specs, policies, profiles, and the command index. | MIT | <https://pypi.org/project/PyYAML/> |
| rfc8785 | 0.1.4 | RFC 8785 canonical JSON; all identity digests hash this serialization. | Apache-2.0 | <https://pypi.org/project/rfc8785/> |
| cloudevents | 2.2.0 | Official CloudEvents 1.0 SDK for portable event export (interchange envelope only, never internal truth). | Apache-2.0 | <https://pypi.org/project/cloudevents/> |
| filelock | 3.32.2 | Cross-platform project mutation lock (`.gauntlet/locks/project.lock`). | MIT | <https://pypi.org/project/filelock/> |

## Optional extras

Install with `uv sync --locked --extra <name>` (or `--all-extras`).

| Extra | Package | Locked version | Role | License | Link |
|---|---|---|---|---|---|
| `otel` | opentelemetry-api | 1.44.0 | Telemetry span emission API (observational only; never part of an authorization or promotion quorum). | Apache-2.0 | <https://pypi.org/project/opentelemetry-api/> |
| `otel` | opentelemetry-sdk | 1.44.0 | Telemetry SDK/exporters for the OTel adapter. | Apache-2.0 | <https://pypi.org/project/opentelemetry-sdk/> |
| `stats` | scipy | 1.17.1 (Python 3.11) / 1.18.0 (Python ≥ 3.12) | Established statistical tests for promotion (exact sign test, t-based confidence intervals). Nontrivial inference is never hand-rolled. | BSD-3-Clause | <https://pypi.org/project/scipy/> |
| `stats` | numpy | 2.4.6 (Python 3.11) / 2.5.1 (Python ≥ 3.12) | Numeric support for the stats extra. | BSD-3-Clause (with bundled-component licenses; see package metadata) | <https://pypi.org/project/numpy/> |
| `postgres` | activegraph[postgres] → psycopg | 3.3.4 | Optional shared Postgres store for ActiveGraph (explicit URL via local/env config; credentials never committed). | LGPL-3.0-only | <https://pypi.org/project/psycopg/> |
| `workflows` | agent-framework-declarative | 1.0.1 | Microsoft Agent Framework declarative (YAML) workflow runtime used by the `workflow` family for durable, checkpoint-resumable orchestration. Pulls in agent-framework-core 1.13.0 (MIT), httpx 0.28.1 (BSD-3-Clause), and powerfx 0.0.34 (MIT). | MIT | <https://pypi.org/project/agent-framework-declarative/> |

## Development dependencies (`dev` extra)

| Package | Locked version | Role | License |
|---|---|---|---|
| pytest | 8.4.2 | Test runner. | MIT |
| pytest-cov | 7.1.0 | Coverage reporting. | MIT |
| hypothesis | 6.165.2 | Property-based and adversarial tests. | MPL-2.0 |
| ruff | 0.16.1 | Lint and format checks. | MIT |
| mypy | 1.20.2 | Strict static typing of the control/safety surface. | MIT |
| types-pyyaml | 6.0.12.20260724 | PyYAML type stubs for mypy. | Apache-2.0 |

## External tools (optional, invoked as subprocesses)

Never vendored; invoked as argv arrays through the effect/authority layer
only when installed and configured. A missing tool fails with installation
guidance (exit code 8); results are never fabricated.

| Tool | Role | License | Link |
|---|---|---|---|
| git | Required. Candidate branches, external worktrees, three-way applicability checks, promotion commits. | GPL-2.0 | <https://git-scm.com/> |
| uv | Required. Locked environment, execution, build, clean-install tests. | MIT or Apache-2.0 | <https://github.com/astral-sh/uv> |
| oras | Optional. OCI registry push/pull for evidence bundles (`gauntlet bundle push|pull`). | Apache-2.0 | <https://oras.land/> |
| cosign | Optional. Signing/verification of provenance statements when explicitly configured; unsigned statements are always labeled unsigned. | Apache-2.0 | <https://github.com/sigstore/cosign> |
| langsmith (CLI) | Optional. Official LangSmith CLI for trace/dataset/evaluator import (`gauntlet observe langsmith`). API keys pass only through allowlisted environment variables. | see upstream | <https://docs.langchain.com/langsmith/> |

## Notices

- ActiveGraph ships a `NOTICE` file; it is preserved in the installed
  distribution and not copied here.
- Transitive dependencies are pinned in `uv.lock`; consult the lock for the
  complete resolution.
