# Architecture

## When to load this file

Load it when you need the system model behind the commands: planes, storage,
settlement, dependency rationale, or extension points. It is self-contained.

## Four logical planes

The planes share one physical runtime (ActiveGraph over SQLite) but their
semantics never blur:

| Plane | Contents | May authorize actions? |
|---|---|---|
| Authority and intent | Proposed future actions, votes, commits, aborts, effect settlement. | Yes — the only plane that does. |
| World and artifact | Immutable facts: artifact lineage, observations, beliefs, counterexamples, decisions. | Evidence for authority, never authority itself. |
| Trace and telemetry | High-volume spans, model/tool traces, latency, cost, imported vendor telemetry. Sampled or dropped freely. | Never. |
| Experiment and promotion | Hypotheses, fork points, candidate branches, evaluator results, keep/discard, held-out confirmation, promotion, rollback, release. | Feeds the promotion kernel's gates. |

Corollary: intent ≠ decision ≠ event ≠ observation ≠ diagnosis ≠ belief ≠
artifact. Each is a distinct record type (see
`scripts/gauntlet/models.py` and the committed schemas in `assets/schemas/`).

## ActiveGraph boundary

ActiveGraph (locked at 1.10.0) is the single event store, scheduler, replay
engine, policy engine, and promotion algorithm. Gauntlet's integration is
deliberately narrow:

- `scripts/gauntlet/activegraph_adapter.py` — a typed adapter over the
  public runtime lifecycle. Mutations are event-sourced: construct an
  `Event`, `graph.emit(event)`, `run_until_idle()`. No ActiveGraph SQLite
  table is ever touched directly.
- `scripts/gauntlet/activegraph_pack.py` — the Gauntlet pack, registered via
  the `activegraph.packs` entry point. It declares the object types
  (project, spec, campaign, artifact, evaluator, observation, belief, issue,
  counterexample, diagnosis, intervention, intent, vote, effect, experiment,
  candidate, decision, promotion, release, bundle, handoff) and typed
  relations (`derived_from`, `supports`, `contradicts`, `depends_on`,
  `violates`, `falsifies`, `repairs`, `supersedes`, `revokes`,
  `promoted_from`, `forked_from`, …) with source/target enforcement.
- Deterministic behaviors validate every domain state transition (intent,
  belief, experiment, campaign). An invalid transition never mutates the
  graph; it emits a durable `gauntlet.<domain>.rejected` event, so bad
  proposals become evidence rather than crashes.
- A conformance suite (`scripts/tests/conformance/`) fails loudly if the
  upstream contract changes.

Gauntlet contains no second scheduler, graph database, event store, replay
engine, policy engine, or branch promotion algorithm.

## Settlement across Git, artifacts, and the graph

Git, ActiveGraph, the content-addressed artifact store, and any external
registry cannot share one atomic transaction. Promotion and release settle
through an explicit saga: validate and freeze the plan → acquire the project
lock → stage changes → recheck preconditions at the exact integration commit
→ commit the intent → settle each store in recorded order → append outcomes
per step → compensate reversible completed steps on later failure → mark
uncertain outcomes for reconciliation. Completion is claimed only after all
required settlements verify. `gauntlet promote status` / `gauntlet release
status` report per-store settlement.

## Durable state: tracked vs ignored

`.gauntlet/` (created by `gauntlet project init`) separates two state
classes; the scoped `.gauntlet/.gitignore` enforces the split:

| Tracked | Ignored |
|---|---|
| `spec/`, `policies/`, `schemas/`, `profiles/`, `evaluators/` manifests, `reference-pack/` manifests | `state/` (ActiveGraph SQLite), `cache/`, `tmp/`, `locks/` |
| `counterexamples/` records and curated fixtures | `traces/`, `runs/`, `exports/` (high-volume, reconstructable) |
| `ledger/` — immutable, one-JSON-record-per-file control ledger (campaigns, experiments, decisions, promotions, releases, incidents, bundles) | `artifacts/blobs/`, `artifacts/staging/`, `datasets/promotion/sealed/` |
| `handoffs/` (after redaction), `artifacts/manifests/`, `workflows/` plans and generated YAML | `secrets/` (unconditionally), `config.local.yaml`, `workspace-manifests/*.local.json` |

The ignored runtime database is never the only evidence of accepted
decisions: every promotion, release, governance decision, and retained
counterexample has a portable ledger record linked to ActiveGraph event IDs
and artifact digests. Conversely the tracked ledger is not the full event
history; `gauntlet bundle export|verify|hydrate` moves complete evidence.

## Dependency and adoption matrix

Reuse over rebuild ("NIH rationale"): each concern below is adopted from a
maintained implementation; gauntlet only adapts it. Exact versions and
licenses: [../THIRD_PARTY.md](../THIRD_PARTY.md).

| Dependency | Adopted for | Deliberately not rebuilt |
|---|---|---|
| activegraph 1.10.0 | Event sourcing, projection, replay, fork/diff, R0–R4 authority, fail-closed three-way promotion. | Any competing event store, replay engine, policy engine, or merge algorithm. |
| agent-framework-declarative 1.0.x (extra) | Durable declarative YAML workflow execution with checkpoint/resume and `RequestExternalInput` approval gates. | A workflow engine. |
| click | CLI parsing, groups, completion. | An argument parser. |
| pydantic v2 | Strict typed contracts + JSON Schema Draft 2020-12 generation. | A validation layer. |
| rfc8785 | RFC 8785 canonical JSON for every identity digest. | Canonicalization code. |
| cloudevents | Portable CloudEvents 1.0 export envelopes. | An event interchange format. |
| filelock | Cross-platform project mutation lock. | Lock primitives. |
| scipy/numpy (extra) | Established statistical tests for promotion gates. | Hand-rolled significance testing (forbidden; missing scipy for a nontrivial test is exit code 8). |
| opentelemetry-api/sdk (extra) | Observational span emission with namespaced `gauntlet.*` attributes. | A telemetry pipeline. |
| git (external) | Branches, external worktrees, three-way applicability, immutable commits. | A VCS. |
| oras / cosign / langsmith CLIs (external) | Registry transport, signing, trace export — argv arrays, authority-gated. | Registry clients, signers, or a LangSmith clone. |

## Extension points

- **Effect adapters** — implement the narrow `EffectAdapter` protocol
  (prepare/execute/compensate/reconcile) in `scripts/gauntlet/effects.py`;
  only the executor may invoke one, and only for a committed intent.
- **Trace importers** — adapters under `scripts/gauntlet/adapters/`
  normalize into `NormalizedTraceEvent` while preserving raw payloads by
  digest (`generic_jsonl`, `langsmith_cli`, `nemo_atof`, `opentelemetry`).
- **Evaluators** — declared in `.gauntlet/evaluators/` manifests
  (`dev.gauntlet.evaluator/v1`), executed as argv arrays with structured
  `.gauntlet-result.json` output; templates in `assets/evaluator-templates/`.
- **Domain profiles** — one `assets/profiles/*.yaml` plus one
  `references/profile-*.md`; profiles add representations, transforms, and
  evaluator templates, never fork the core state model.
- **Counterexample reducers** — pluggable `Reducer` implementations for
  minimization.
- **Workflow plans** — `WorkflowPlanV1` documents rendered deterministically
  to Microsoft Agent Framework YAML (see
  [workflows.md](workflows.md)).
- **Injected seams** — clock, ID generation, filesystem, Git runner, process
  runner, and the ActiveGraph adapter are constructor-injected everywhere,
  so integrations stay testable and deterministic.

## Non-goals

- No embedded LLM provider; core tests and the quickstart run without API
  keys or network access. Host-model intelligence proposes; scripts decide.
- No web server, ORM, message broker, container runtime, or model SDK in
  core.
- No media generators/parsers (OpenUSD, glTF, SVG, and similar are driven
  through external tools declared in profiles).
- No reimplementation of MCP, A2A, LangSmith, NeMo, or OCI registries —
  they remain external protocols and tools behind optional adapters.
- No cryptographic isolation claims: candidate sandboxing is process
  discipline; the stronger mode uses separate CI credentials (see
  [safety.md](safety.md)).
