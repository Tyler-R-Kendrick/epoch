# Contracts: schemas, state machines, events, exit codes, versioning

## When to load this file

Load it to consume or produce dev.gauntlet/v1 records programmatically, to
interpret an exit code or state value, or to run the `schema` command
family (`gauntlet schema generate|check`).

## Where the contract lives

- Strict Pydantic v2 models (`extra="forbid"` on normative/authority-bearing
  models, explicit `schema_version`, stable IDs, RFC 3339 UTC timestamps,
  SHA-256 digests over RFC 8785 canonical JSON):
  `scripts/gauntlet/models.py`.
- Committed JSON Schemas (Draft 2020-12), generated from the models:
  `assets/schemas/*.schema.json` plus `manifest.json`. `gauntlet project
  init` copies the installed set into `.gauntlet/schemas/` so historical
  state stays self-describing.
- Closed vocabularies: `scripts/gauntlet/constants.py`. Extending a closed
  vocabulary requires a namespaced value (`x-<namespace>/<name>`), never a
  silent semantic change.

## Stable schema inventory (dev.gauntlet/v1)

| Group | Models |
|---|---|
| Foundational references | `DigestRefV1`, `ArtifactRefV1`, `ActorRefV1`, `SourceRefV1`, `ToolRefV1`, `ModelRefV1`, `EnvironmentRefV1`, `GitRefV1`, `EvidenceRefV1` |
| Project and configuration | `ProjectConfigV1` (+ `RuntimeConfigV1`, `ArtifactStoreConfigV1`, `TelemetryConfigV1`, `PrivacyConfigV1`, `IntegrationsConfigV1`, `ProjectDefaultsV1`) |
| Specification | `GauntletSpecV1` (+ `SpecGoalV1`, `SpecNormativeV1`, `SpecSearchSpaceV1`, `SpecRepresentationsV1`, `SpecEvaluatorsV1`, `SpecSplitsV1`, `SpecPromotionV1`, `SpecRuntimeV1`, `ConfidencePolicyV1`), `ReferencePackV1`, `ReferenceEntryV1`, `RepresentationProfileV1`, `ArtifactNodeV1`, `TransformEdgeV1`, `EvaluatorManifestV1` (+ `EvaluatorCommandV1`), `DatasetManifestV1` (+ `DatasetCaseV1`), `BudgetV1`, `StopPolicyV1` |
| Authority and effects | `ActionIntentV1`, `VoteV1`, `AuthorityDecisionV1`, `EffectPlanV1`, `EffectResultV1`, `ReconciliationRecordV1`, `ReleasePlanV1` |
| Evidence and epistemic state | `ObservationV1`, `BeliefV1`, `CounterexampleV1`, `DiagnosisV1`, `InterventionV1`, `IssueClusterV1` |
| Experiments and promotion | `CampaignV1`, `HypothesisV1`, `ExperimentV1`, `CandidateV1`, `EvaluationResultV1`, `MetricResultV1`, `ComparisonV1`, `PromotionPlanV1`, `GateCheckV1`, `PromotionDecisionV1`, `ReleaseDecisionV1`, `HandoffV1` |
| Provenance and portability | `ProvenanceRecordV1`, `BundleManifestV1` (+ `BundleEntryV1`), `GauntletCloudEventV1`, `TrajectoryV1` (+ `TrajectoryStepV1`), `ReplayRecordV1` |
| Workflows | `WorkflowPlanV1` (+ `WorkflowStepV1`) |

`DigestRefV1` carries algorithm, value, media type, byte size when known,
and optional storage URIs — a filename is never artifact identity.

## State machines

Defined in `scripts/gauntlet/constants.py`; every transition is validated
deterministically and an invalid transition becomes a durable rejection
event, not a crash.

**IntentState** (write-ahead authority):

```text
proposed → voting → committed | aborted
committed → executing → completed | failed_before_effect
                       | failed_after_effect | outcome_unknown
failed_after_effect → compensated | compensation_failed
outcome_unknown     → reconciled | compensated | compensation_failed
```

**BeliefState**: `raw → tentative → validated → committed → action_safe`,
with `quarantined` reachable from any live state (and recoverable to
`tentative`), and `superseded`/`revoked` terminal. `committed` means
epistemically accepted; it does not automatically mean `action_safe`.

**ExperimentStatus**: `proposed | blocked | running | keep | discard |
crash | inconclusive | superseded`.

**CampaignState**: `draft → active → checkpointed → stopped`.

Supporting closed vocabularies: `ActionClass` (R0–R4), `EffectClass`
(`pure`, `read_only`, `idempotent_known_outcome`, `bufferable`,
`reversible`, `reversible_with_cost`, `irreversible_gated`, `unknown`),
`ActionSeam` (10 seams from `specification` to `representation`),
`EvaluatorRole`, `IndependenceLevel` (L0–L4), `SplitKind`, `ReplayMode`,
`VoteDecision`, `VoterKind`, `StopReason`, `ArtifactRole`.

## Event types (CloudEvents export)

`CLOUDEVENT_TYPES` in `constants.py` — the portable interchange envelope
(CloudEvents 1.0 via the official SDK); ActiveGraph remains internal truth:

```text
dev.gauntlet.spec.frozen.v1
dev.gauntlet.intent.proposed.v1 | .committed.v1 | .aborted.v1
dev.gauntlet.effect.started.v1 | .completed.v1 | .failed.v1
  | .unknown.v1 | .compensated.v1
dev.gauntlet.observation.recorded.v1
dev.gauntlet.belief.validated.v1 | .revoked.v1
dev.gauntlet.counterexample.created.v1
dev.gauntlet.experiment.completed.v1
dev.gauntlet.promotion.accepted.v1 | .rejected.v1
dev.gauntlet.release.completed.v1
```

Bundle media types (`BUNDLE_MEDIA_TYPES`):
`application/vnd.gauntlet.{bundle,counterexample,evaluation,promotion,provenance}.v1+json`,
`application/vnd.gauntlet.spec.v1+yaml`,
`application/vnd.gauntlet.event-stream.v1+jsonl`.

## Stable exit codes

From `ExitCode` in `constants.py`, mapped by the `GauntletError` hierarchy
in `errors.py`:

| Code | Meaning | Error class |
|---|---|---|
| 0 | command succeeded or gate passed | — |
| 2 | invalid invocation, schema, or configuration | `InvalidInvocationError` |
| 3 | approval or governance decision required | `ApprovalRequiredError` |
| 4 | invariant, evaluator, or promotion gate failed | `GateFailedError` |
| 5 | evidence inconclusive; do not promote | `InconclusiveError` |
| 6 | concurrency, Git, or graph promotion conflict | `ConflictError` |
| 7 | external effect outcome unknown; reconcile | `OutcomeUnknownError` |
| 8 | required dependency or integration unavailable | `DependencyUnavailableError` |
| 9 | integrity, provenance, leakage, or security violation | `SecurityViolationError` |

`--json` failures also print `{"error", "hint", "exit_code"}` on stdout.

## Schema lifecycle and compatibility policy

- `gauntlet schema generate` regenerates committed schemas from the models
  (developer context only); `gauntlet schema check` fails on any drift
  between committed and generated schemas.
- A released schema version is never mutated in place. Contract growth adds
  a new version (`…/v2`) alongside the old one; persisted `…/v1` records
  stay readable, with explicit migration through `gauntlet project migrate`
  (which backs up state and preserves old schemas).
- Every persisted record carries its `schema_version`; consumers must
  reject unknown versions rather than best-effort parse them.
- Vocabulary members are never repurposed; new semantics get new namespaced
  values.
- The skill contract identifier is `dev.gauntlet/v1` (frontmatter
  `metadata.contract`); project state records the schema digests it was
  created with so historical state remains self-describing.

## External docs

- JSON Schema Draft 2020-12: <https://json-schema.org/specification>
- CloudEvents 1.0: <https://cloudevents.io/>
- RFC 8785: <https://www.rfc-editor.org/rfc/rfc8785>
