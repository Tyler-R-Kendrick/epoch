# Optional integrations

## When to load this file

Load it to enable, configure, or troubleshoot an optional integration. The
core loop needs none of them: it is network-free and runs without API keys.
Every integration degrades to a clear exit-code-8 failure with installation
guidance when missing, and none of them ever gains authority over
promotion, release, or policy.

## Install checks

`gauntlet project doctor` reports each integration's availability.
`.gauntlet/config.yaml` sets detection per integration
(`integrations.langsmith_cli|nemo_atof|oras_cli|cosign_cli: auto`), and
Python extras install with:

```bash
uv sync --locked --extra otel --extra stats --extra postgres --extra workflows
# or: uv sync --locked --all-extras
```

Tested versions below are the exact `uv.lock` resolutions (see
[../THIRD_PARTY.md](../THIRD_PARTY.md) for licenses).

## LangSmith CLI (`gauntlet observe langsmith`)

- **Install check:** the official `langsmith` executable on `PATH`.
- **Credentials:** the API key passes only through allowlisted environment
  variables (e.g. `LANGSMITH_API_KEY`) to the subprocess; it is never
  written to argv, files, or records, and CLI output is redacted before
  persistence. Never echo the value.
- **Adopted semantics:** trace/dataset/annotation/evaluator exports import
  as observations; LangSmith IDs (`id`, `trace_id`, `parent_run_id`,
  `session_id`) and raw export digests are preserved verbatim.
- **Outside gauntlet's authority:** LangSmith automations, suggested fixes,
  expected answers, and evaluators are candidate/evaluative artifacts until
  independently verified; LangSmith never becomes the transactional
  promotion authority.

## OpenTelemetry (`otel` extra; `gauntlet observe otel`)

- **Tested versions:** opentelemetry-api 1.44.0, opentelemetry-sdk 1.44.0.
- **Credentials:** exporter endpoints/headers come from standard OTel
  environment variables; gauntlet stores none of them.
- **Adopted semantics:** spans for command, intent, evaluator, experiment,
  promotion, release, and adapter execution; namespaced `gauntlet.*`
  attributes; metadata-by-default (raw prompt/response content only when
  `telemetry.include_raw_content` is true); deterministic sampling by event
  key; OTLP-JSON file import produces observations.
- **Outside gauntlet's authority:** trace delivery is never part of an
  authorization or promotion quorum. Telemetry is observational, full stop.

## NeMo Relay ATOF (`gauntlet observe atof`)

- **Install check:** none needed — a file importer with no NVIDIA runtime
  dependency.
- **Tested semantics:** ATOF-compatible JSONL with a header record
  declaring `atof_version: "1.0"` (the only supported version; anything
  else fails with the version named). Scopes, marks, tool/model events, and
  source IDs map onto the normalized trace model; unrecognized fields are
  retained, never discarded.
- **Outside gauntlet's authority:** BLADE-style failure-regime routing to
  action seams is advisory; every proposed seam must be experimentally
  tested.

## ORAS CLI (`gauntlet bundle push|pull`)

- **Install check:** `oras` on `PATH`; missing CLI is exit 8.
- **Credentials:** registry auth is ORAS's own (its login/credential
  store); gauntlet passes references, never credentials.
- **Adopted semantics:** OCI artifact push/pull of evidence bundles as argv
  arrays through the injected process runner, references validated against
  option injection, `--dry-run` prints exact argv, and every real execution
  is authority-gated (R3/R2). The local bundle format works with no
  registry at all.
- **Outside gauntlet's authority:** registry contents; a pulled bundle is
  untrusted until `gauntlet bundle verify` passes.

## cosign (provenance signing)

- **Install check:** `cosign` on `PATH` **and** explicit configuration;
  otherwise signing is simply absent.
- **Credentials:** cosign's own keyless/key material; gauntlet never
  stores it.
- **Adopted semantics:** sign/verify of in-toto statements and bundle
  digests when configured. Unsigned statements always carry
  `unsigned: true` and are never called attestations or signatures; a
  signature is never fabricated.
- **Outside gauntlet's authority:** trust-root decisions are R4
  governance; verification failure is exit 9, not a warning.

## Microsoft Agent Framework workflows (`workflows` extra)

- **Tested versions:** agent-framework-declarative 1.0.1 (with
  agent-framework-core 1.13.0).
- **Credentials:** none required for local declarative runs.
- **Adopted semantics:** durable execution of gauntlet-generated,
  literal-only declarative YAML with checkpoints, resume, and
  `RequestExternalInput` approval gates. See
  [workflows.md](workflows.md) for the full family.
- **Outside gauntlet's authority:** the workflow layer orchestrates; the
  CLI's authority/effect enforcement stands regardless of what a workflow
  requests.

## SciPy statistics (`stats` extra)

- **Tested versions:** scipy 1.17.1 / numpy 2.4.6 on Python 3.11; scipy
  1.18.0 / numpy 2.5.1 on Python ≥ 3.12.
- **Adopted semantics:** exact sign tests, t-based confidence intervals,
  seeded bootstrap for promotion gates. Requesting a nontrivial test
  without the extra is exit 8 — hand-rolled fallbacks are forbidden.
- **Outside gauntlet's authority:** statistics inform gates; the
  lexicographic promotion order and hard invariants still dominate.

## Postgres store (`postgres` extra)

- **Tested versions:** activegraph[postgres] pulling psycopg 3.3.4.
- **Credentials:** an explicit Postgres URL via local/environment
  configuration (`config.local.yaml` or environment) — never committed;
  `config.local.yaml` is ignored by the scoped `.gitignore`.
- **Adopted semantics:** a shared ActiveGraph store for team deployments;
  identical runtime semantics to the default SQLite store at
  `.gauntlet/state/activegraph.sqlite3`.
- **Outside gauntlet's authority:** database provisioning, backups beyond
  the migration backup hook, and access control.

## Workflow-shape exporters (built in, no install)

Arazzo 1.0.1 and Open Workflow Specification-style (`specVersion: "0.1"`)
exports describe orchestration shape and dependencies only, with binding
gauntlet contract digests in metadata. They never replace gauntlet
authority, evidence, evaluator, or promotion semantics.

## External docs

- LangSmith: <https://docs.langchain.com/langsmith/>
- OpenTelemetry: <https://opentelemetry.io/docs/>
- NeMo Relay: <https://docs.nvidia.com/nemo/>
- ORAS: <https://oras.land/docs/>
- Sigstore cosign: <https://docs.sigstore.dev/>
- Microsoft Agent Framework: <https://learn.microsoft.com/en-us/agent-framework/>
- Arazzo: <https://spec.openapis.org/arazzo/latest.html>
