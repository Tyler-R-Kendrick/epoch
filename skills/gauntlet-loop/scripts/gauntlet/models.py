"""Strict Pydantic v2 models for every persisted dev.gauntlet/v1 contract.

Rules that bind this module:

- ``extra="forbid"`` on every normative or authority-bearing model;
- explicit ``schema_version`` and stable IDs on persisted records;
- RFC 3339 UTC timestamps as strings (canonical JSON stays deterministic);
- SHA-256 digests in ``sha256:<hex>`` form (``DigestRefV1`` for typed refs);
- identity is a digest, never a filename.

The coordinator owns this file. Subagents propose interface changes through a
decision record; they do not fork these contracts.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from gauntlet.constants import (
    ActionClass,
    ActionSeam,
    ArtifactRole,
    BeliefState,
    CampaignState,
    EffectClass,
    EvaluatorRole,
    ExperimentStatus,
    IndependenceLevel,
    IntentState,
    ReplayMode,
    SplitKind,
    StopReason,
    VoteDecision,
    VoterKind,
)

RFC3339_UTC_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$"
DIGEST_PATTERN = r"^sha256:[0-9a-f]{64}$"
ID_PATTERN = r"^[a-z][a-z0-9-]*:[A-Za-z0-9._/-]+$"

UtcTimestamp = Annotated[str, Field(pattern=RFC3339_UTC_PATTERN)]
Digest = Annotated[str, Field(pattern=DIGEST_PATTERN)]
StableId = Annotated[str, Field(pattern=ID_PATTERN)]
NonEmptyStr = Annotated[str, Field(min_length=1)]


class GauntletModel(BaseModel):
    """Base for all persisted contracts: strict, no silent extra fields."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True, str_strip_whitespace=False)


# ---------------------------------------------------------------------------
# Foundational references
# ---------------------------------------------------------------------------


class DigestRefV1(GauntletModel):
    """Content identity. Never trust a filename as artifact identity."""

    schema_version: Literal["dev.gauntlet.digest-ref/v1"] = "dev.gauntlet.digest-ref/v1"
    algorithm: Literal["sha256"] = "sha256"
    value: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
    media_type: str | None = None
    byte_size: Annotated[int, Field(ge=0)] | None = None
    storage_uris: list[NonEmptyStr] = Field(default_factory=list)

    @property
    def digest(self) -> str:
        return f"{self.algorithm}:{self.value}"


class ArtifactRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.artifact-ref/v1"] = "dev.gauntlet.artifact-ref/v1"
    artifact_id: StableId
    role: ArtifactRole
    digest: DigestRefV1
    representation: str | None = None
    logical_name: str | None = None


class ActorRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.actor-ref/v1"] = "dev.gauntlet.actor-ref/v1"
    actor_id: NonEmptyStr
    kind: Literal["human", "agent", "service", "tool"]
    display_name: str | None = None
    capability_digest: Digest | None = None


class SourceRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.source-ref/v1"] = "dev.gauntlet.source-ref/v1"
    source_id: NonEmptyStr
    kind: NonEmptyStr
    uri: str | None = None
    accessed_at: UtcTimestamp | None = None
    rights: str | None = None
    raw_payload_digest: Digest | None = None


class ToolRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.tool-ref/v1"] = "dev.gauntlet.tool-ref/v1"
    name: NonEmptyStr
    version: str | None = None
    contract_digest: Digest | None = None


class ModelRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.model-ref/v1"] = "dev.gauntlet.model-ref/v1"
    provider: NonEmptyStr
    model: NonEmptyStr
    version: str | None = None
    parameters_digest: Digest | None = None


class EnvironmentRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.environment-ref/v1"] = "dev.gauntlet.environment-ref/v1"
    platform: NonEmptyStr
    python_version: str | None = None
    lock_digest: Digest | None = None
    environment_digest: Digest | None = None
    variables_allowlisted: list[str] = Field(default_factory=list)


class GitRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.git-ref/v1"] = "dev.gauntlet.git-ref/v1"
    repository: str | None = None
    branch: str | None = None
    commit: Annotated[str, Field(pattern=r"^[0-9a-f]{7,64}$")] | None = None
    dirty: bool | None = None


class EvidenceRefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.evidence-ref/v1"] = "dev.gauntlet.evidence-ref/v1"
    kind: Literal[
        "observation", "belief", "counterexample", "evaluation", "trace", "artifact", "event"
    ]
    ref_id: StableId
    digest: Digest | None = None


# ---------------------------------------------------------------------------
# Project and specification
# ---------------------------------------------------------------------------


class RuntimeConfigV1(GauntletModel):
    engine: Literal["activegraph"] = "activegraph"
    store: NonEmptyStr = ".gauntlet/state/activegraph.sqlite3"
    authority_ceiling: ActionClass = ActionClass.R1
    worktree_root: NonEmptyStr = "auto-sibling"
    lock_timeout_seconds: Annotated[int, Field(ge=1)] = 30


class ArtifactStoreConfigV1(GauntletModel):
    local_store: NonEmptyStr = ".gauntlet/artifacts/blobs"
    digest_algorithm: Literal["sha256"] = "sha256"
    max_blob_bytes: Annotated[int, Field(ge=1)] = 1_073_741_824
    remote: str | None = None


class TelemetryConfigV1(GauntletModel):
    enabled: bool = False
    exporter: Literal["none", "otlp-file", "console"] = "none"
    include_raw_content: bool = False
    sample_ratio: Annotated[float, Field(ge=0.0, le=1.0)] = 1.0


class PrivacyConfigV1(GauntletModel):
    redact_by_default: bool = True
    secret_environment_allowlist: list[str] = Field(default_factory=list)
    raw_trace_retention_days: Annotated[int, Field(ge=0)] = 14


class IntegrationsConfigV1(GauntletModel):
    langsmith_cli: Literal["auto", "on", "off"] = "auto"
    nemo_atof: Literal["auto", "on", "off"] = "auto"
    oras_cli: Literal["auto", "on", "off"] = "auto"
    cosign_cli: Literal["auto", "on", "off"] = "auto"


class ProjectDefaultsV1(GauntletModel):
    profile: NonEmptyStr = "software"
    non_interactive: bool = False
    network_for_candidates: bool = False


class ProjectConfigV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.project/v1"] = "dev.gauntlet.project/v1"
    project_id: NonEmptyStr
    skill_contract: Literal["dev.gauntlet/v1"] = "dev.gauntlet/v1"
    runtime: RuntimeConfigV1 = Field(default_factory=RuntimeConfigV1)
    artifacts: ArtifactStoreConfigV1 = Field(default_factory=ArtifactStoreConfigV1)
    telemetry: TelemetryConfigV1 = Field(default_factory=TelemetryConfigV1)
    privacy: PrivacyConfigV1 = Field(default_factory=PrivacyConfigV1)
    integrations: IntegrationsConfigV1 = Field(default_factory=IntegrationsConfigV1)
    defaults: ProjectDefaultsV1 = Field(default_factory=ProjectDefaultsV1)

    @field_validator("project_id")
    @classmethod
    def _no_template_sentinel(cls, value: str) -> str:
        if "${" in value:
            raise ValueError("project_id still contains a template sentinel")
        return value


class ReferenceEntryV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.reference-entry/v1"] = "dev.gauntlet.reference-entry/v1"
    entry_id: StableId
    kind: Literal["positive-example", "negative-example", "anchor-pair", "source", "guidance"]
    source: SourceRefV1
    digest: DigestRefV1
    verified: bool = False
    notes: str | None = None


class ReferencePackV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.reference-pack/v1"] = "dev.gauntlet.reference-pack/v1"
    pack_id: StableId
    entries: list[ReferenceEntryV1] = Field(default_factory=list)
    provenance_and_rights_required: bool = True
    validity_policy: str | None = None


class ArtifactNodeV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.artifact-node/v1"] = "dev.gauntlet.artifact-node/v1"
    node_id: StableId
    representation: NonEmptyStr
    role: ArtifactRole
    media_type: str | None = None
    description: str | None = None
    canonical_for: str | None = None
    losses: list[str] = Field(default_factory=list)


class TransformEdgeV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.transform-edge/v1"] = "dev.gauntlet.transform-edge/v1"
    edge_id: StableId
    source: NonEmptyStr
    target: NonEmptyStr
    tool: ToolRefV1
    deterministic: bool
    seed: int | None = None
    configuration_digest: Digest | None = None
    lossy: bool
    protected_invariants: list[str] = Field(default_factory=list)
    expected_equivariances: list[str] = Field(default_factory=list)
    round_trip_checks: list[str] = Field(default_factory=list)
    output_media_type: str | None = None
    cost_class: str | None = None
    timeout_seconds: Annotated[int, Field(ge=1)] = 300
    rights_implications: str | None = None


class RepresentationProfileV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.profile/v1"] = "dev.gauntlet.profile/v1"
    profile_id: StableId
    display_name: NonEmptyStr
    description: NonEmptyStr
    nodes: list[ArtifactNodeV1] = Field(default_factory=list)
    transforms: list[TransformEdgeV1] = Field(default_factory=list)
    evaluator_templates: list[str] = Field(default_factory=list)
    default_target_dimensions: list[str] = Field(default_factory=list)
    default_protected_dimensions: list[str] = Field(default_factory=list)
    reference: NonEmptyStr


class EvaluatorCommandV1(GauntletModel):
    argv: Annotated[list[NonEmptyStr], Field(min_length=1)]
    cwd: Literal["candidate-worktree", "staging", "project-root"] = "candidate-worktree"
    timeout_seconds: Annotated[int, Field(ge=1)] = 300
    network: Literal["deny", "allow"] = "deny"
    environment_allowlist: list[str] = Field(default_factory=list)


class EvaluatorManifestV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.evaluator/v1"] = "dev.gauntlet.evaluator/v1"
    id: StableId
    kind: Literal["command", "learned", "llm-judge", "human", "builtin"]
    roles: Annotated[list[EvaluatorRole], Field(min_length=1)]
    independence: IndependenceLevel
    command: EvaluatorCommandV1 | None = None
    input_contract: dict[str, Any] = Field(default_factory=dict)
    output_contract: dict[str, Any] = Field(default_factory=dict)
    cost_class: NonEmptyStr = "bounded-local"
    frozen_for_promotion: bool = False
    version: NonEmptyStr = "0.1.0"
    calibration_manifest: str | None = None


class DatasetCaseV1(GauntletModel):
    case_id: StableId
    digest: DigestRefV1
    expected: Literal["good", "bad", "tie", "abstain"] | None = None
    notes: str | None = None


class DatasetManifestV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.dataset/v1"] = "dev.gauntlet.dataset/v1"
    dataset_id: StableId
    split: SplitKind
    sealed: bool = False
    cases: list[DatasetCaseV1] = Field(default_factory=list)
    storage: Literal["tracked", "local-ignored", "remote-digest"] = "tracked"
    notes: str | None = None


class BudgetV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.budget/v1"] = "dev.gauntlet.budget/v1"
    max_experiments: Annotated[int, Field(ge=1)] | None = None
    max_wall_clock_seconds: Annotated[int, Field(ge=1)] | None = None
    max_evaluator_runs: Annotated[int, Field(ge=1)] | None = None
    max_cost_usd: Annotated[float, Field(ge=0.0)] | None = None

    def has_hard_cap(self) -> bool:
        return any(
            limit is not None
            for limit in (
                self.max_experiments,
                self.max_wall_clock_seconds,
                self.max_evaluator_runs,
                self.max_cost_usd,
            )
        )


class StopPolicyV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.stop-policy/v1"] = "dev.gauntlet.stop-policy/v1"
    hard_budget: BudgetV1
    target_condition: str | None = None
    plateau_window: Annotated[int, Field(ge=1)] | None = None
    plateau_min_improvement: float | None = None
    disagreement_threshold: Annotated[float, Field(ge=0.0, le=1.0)] | None = None
    unresolved_severity_threshold: str | None = None


class SpecGoalV1(GauntletModel):
    statement: NonEmptyStr
    deliverables: list[str] = Field(default_factory=list)
    non_goals: list[str] = Field(default_factory=list)


class SpecNormativeV1(GauntletModel):
    hard_invariants: list[str] = Field(default_factory=list)
    target_dimensions: list[str] = Field(default_factory=list)
    protected_dimensions: list[str] = Field(default_factory=list)
    human_only_judgments: list[str] = Field(default_factory=list)


class SpecSearchSpaceV1(GauntletModel):
    legal_levers: list[str] = Field(default_factory=list)
    frozen_surfaces: list[str] = Field(default_factory=list)
    candidate_budget: BudgetV1 | None = None
    concurrency_policy: str | None = None


class SpecRepresentationsV1(GauntletModel):
    nodes: list[ArtifactNodeV1] = Field(default_factory=list)
    transforms: list[TransformEdgeV1] = Field(default_factory=list)
    required_consistency_relations: list[str] = Field(default_factory=list)


class SpecEvaluatorsV1(GauntletModel):
    hard: list[str] = Field(default_factory=list)
    deterministic: list[str] = Field(default_factory=list)
    simulators: list[str] = Field(default_factory=list)
    learned: list[str] = Field(default_factory=list)
    llm_judges: list[str] = Field(default_factory=list)
    human: list[str] = Field(default_factory=list)
    calibration_manifest: str | None = None


class SpecSplitsV1(GauntletModel):
    search_manifest: str | None = None
    calibration_manifest: str | None = None
    promotion_manifest: str | None = None


class ConfidencePolicyV1(GauntletModel):
    method: NonEmptyStr = "configured-per-metric"
    level: Annotated[float, Field(gt=0.0, lt=1.0)] = 0.95
    multiple_comparison_correction: Literal["none", "bonferroni", "holm"] = "none"


class SpecPromotionV1(GauntletModel):
    minimum_practical_effect: float | None = None
    protected_regression_budgets: dict[str, float] = Field(default_factory=dict)
    confidence_policy: ConfidencePolicyV1 = Field(default_factory=ConfidencePolicyV1)
    evidence_floor: list[str] = Field(default_factory=list)
    required_approvals: list[str] = Field(default_factory=list)


class SpecRuntimeV1(GauntletModel):
    authority_ceiling: ActionClass = ActionClass.R1
    allowed_capabilities: list[str] = Field(default_factory=list)
    effect_policy: str | None = None


class GauntletSpecV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.spec/v1"] = "dev.gauntlet.spec/v1"
    spec_id: StableId
    goal: SpecGoalV1
    normative: SpecNormativeV1 = Field(default_factory=SpecNormativeV1)
    reference_pack: ReferencePackV1 | None = None
    search_space: SpecSearchSpaceV1 = Field(default_factory=SpecSearchSpaceV1)
    representations: SpecRepresentationsV1 = Field(default_factory=SpecRepresentationsV1)
    evaluators: SpecEvaluatorsV1 = Field(default_factory=SpecEvaluatorsV1)
    splits: SpecSplitsV1 = Field(default_factory=SpecSplitsV1)
    promotion: SpecPromotionV1 = Field(default_factory=SpecPromotionV1)
    runtime: SpecRuntimeV1 = Field(default_factory=SpecRuntimeV1)
    stop: StopPolicyV1 | None = None
    frozen: bool = False
    frozen_digest: Digest | None = None
    supersedes: StableId | None = None


# ---------------------------------------------------------------------------
# Authority and effects
# ---------------------------------------------------------------------------


class ActionIntentV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.action-intent/v1"] = "dev.gauntlet.action-intent/v1"
    intent_id: StableId
    project_id: NonEmptyStr
    campaign_id: StableId | None = None
    branch: str | None = None
    correlation_id: NonEmptyStr
    causal_refs: list[EvidenceRefV1] = Field(default_factory=list)
    actor: ActorRefV1
    operation: NonEmptyStr
    capability: NonEmptyStr
    tool: ToolRefV1 | None = None
    input_digest: Digest
    read_scopes: list[str] = Field(default_factory=list)
    write_scopes: list[str] = Field(default_factory=list)
    action_class: ActionClass
    effect_class: EffectClass
    idempotency_key: str | None = None
    preconditions: list[str] = Field(default_factory=list)
    postconditions: list[str] = Field(default_factory=list)
    compensation_strategy: str | None = None
    reconciliation_strategy: str | None = None
    spec_digest: Digest | None = None
    policy_digest: Digest
    evaluator_digest: Digest | None = None
    environment: EnvironmentRefV1 | None = None
    budget: BudgetV1 | None = None
    timeout_seconds: Annotated[int, Field(ge=1)] = 600
    required_voters: list[VoterKind] = Field(default_factory=list)
    expected_observations: list[str] = Field(default_factory=list)
    result_schema: str | None = None
    state: IntentState = IntentState.PROPOSED
    created_at: UtcTimestamp


class VoteV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.vote/v1"] = "dev.gauntlet.vote/v1"
    vote_id: StableId
    intent_id: StableId
    voter_kind: VoterKind
    voter_version: NonEmptyStr
    policy_digest: Digest | None = None
    evidence_digest: Digest | None = None
    decision: VoteDecision
    reason: NonEmptyStr
    expires_at: UtcTimestamp | None = None
    created_at: UtcTimestamp


class AuthorityDecisionV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.authority-decision/v1"] = (
        "dev.gauntlet.authority-decision/v1"
    )
    decision_id: StableId
    intent_id: StableId
    outcome: Literal["committed", "aborted"]
    votes: list[VoteV1] = Field(default_factory=list)
    policy_digest: Digest
    reason: NonEmptyStr
    decided_at: UtcTimestamp


class EffectPlanV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.effect-plan/v1"] = "dev.gauntlet.effect-plan/v1"
    plan_id: StableId
    intent_id: StableId
    adapter: NonEmptyStr
    argv: list[str] = Field(default_factory=list)
    cwd: str | None = None
    environment_allowlist: list[str] = Field(default_factory=list)
    network: Literal["deny", "allow"] = "deny"
    timeout_seconds: Annotated[int, Field(ge=1)] = 600
    max_output_bytes: Annotated[int, Field(ge=1)] = 10_485_760
    staging_paths: list[str] = Field(default_factory=list)
    preconditions_checked_at: UtcTimestamp | None = None


class EffectResultV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.effect-result/v1"] = "dev.gauntlet.effect-result/v1"
    result_id: StableId
    plan_id: StableId
    intent_id: StableId
    outcome: Literal["completed", "failed_before_effect", "failed_after_effect", "outcome_unknown"]
    exit_code: int | None = None
    stdout_digest: Digest | None = None
    stderr_digest: Digest | None = None
    external_ids: dict[str, str] = Field(default_factory=dict)
    adapter_version: str | None = None
    started_at: UtcTimestamp
    settled_at: UtcTimestamp | None = None
    error: str | None = None


class ReconciliationRecordV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.reconciliation/v1"] = "dev.gauntlet.reconciliation/v1"
    reconciliation_id: StableId
    intent_id: StableId
    method: NonEmptyStr
    external_state: dict[str, Any] = Field(default_factory=dict)
    resolution: Literal["confirmed_completed", "confirmed_absent", "still_unknown"]
    resolved_at: UtcTimestamp
    notes: str | None = None


class ReleasePlanV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.release-plan/v1"] = "dev.gauntlet.release-plan/v1"
    plan_id: StableId
    promotion_decision_id: StableId
    effects: list[str] = Field(default_factory=list)
    artifacts: list[ArtifactRefV1] = Field(default_factory=list)
    commits: list[GitRefV1] = Field(default_factory=list)
    required_approvals: list[str] = Field(default_factory=list)
    created_at: UtcTimestamp


# ---------------------------------------------------------------------------
# Evidence and epistemic state
# ---------------------------------------------------------------------------


class ObservationV1(GauntletModel):
    """Append-only raw evidence; never rewritten, only superseded."""

    schema_version: Literal["dev.gauntlet.observation/v1"] = "dev.gauntlet.observation/v1"
    observation_id: StableId
    producer: ToolRefV1
    scope: NonEmptyStr
    subject: EvidenceRefV1 | None = None
    raw_digest: DigestRefV1
    measured_at: UtcTimestamp
    uncertainty: str | None = None
    values: dict[str, Any] = Field(default_factory=dict)
    redaction_report: list[str] = Field(default_factory=list)


class BeliefV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.belief/v1"] = "dev.gauntlet.belief/v1"
    belief_id: StableId
    statement: NonEmptyStr
    state: BeliefState = BeliefState.RAW
    depends_on_observations: list[StableId] = Field(default_factory=list)
    depends_on_beliefs: list[StableId] = Field(default_factory=list)
    supports: list[StableId] = Field(default_factory=list)
    contradicts: list[StableId] = Field(default_factory=list)
    confidence: Annotated[float, Field(ge=0.0, le=1.0)] | None = None
    created_at: UtcTimestamp
    updated_at: UtcTimestamp | None = None


class CounterexampleV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.counterexample/v1"] = "dev.gauntlet.counterexample/v1"
    counterexample_id: StableId
    candidate_id: StableId
    artifact: ArtifactRefV1
    scope: NonEmptyStr
    expected: NonEmptyStr
    actual: NonEmptyStr
    violated_rule: NonEmptyStr
    evidence: Annotated[list[EvidenceRefV1], Field(min_length=1)]
    severity: Literal["critical", "major", "minor", "info"]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    minimal_reproduction: str | None = None
    minimized_from: StableId | None = None
    split_visibility: Literal["search-visible", "calibration-only", "promotion-sealed"] = (
        "search-visible"
    )
    status: Literal["open", "fixed", "retained", "suppression-attempted"] = "open"
    created_at: UtcTimestamp


class DiagnosisV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.diagnosis/v1"] = "dev.gauntlet.diagnosis/v1"
    diagnosis_id: StableId
    hypothesis: NonEmptyStr
    failure_regime: NonEmptyStr
    earliest_divergence: str | None = None
    supporting_evidence: list[EvidenceRefV1] = Field(default_factory=list)
    contradicting_evidence: list[EvidenceRefV1] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    calibration_basis: str | None = None
    falsifier: NonEmptyStr
    candidate_seams: Annotated[list[ActionSeam], Field(min_length=1)]
    claim_level: Literal["observational", "correlational", "experimentally-confirmed"]
    revoked: bool = False
    created_at: UtcTimestamp


class InterventionV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.intervention/v1"] = "dev.gauntlet.intervention/v1"
    intervention_id: StableId
    diagnosis_id: StableId
    primary_seam: ActionSeam
    permitted_globs: Annotated[list[NonEmptyStr], Field(min_length=1)]
    protected_surfaces: list[str] = Field(default_factory=list)
    expected_mechanism: NonEmptyStr
    predicted_effect: NonEmptyStr
    predicted_cost: str | None = None
    experiment_plan: str | None = None
    rollback_plan: NonEmptyStr
    fixes_counterexamples: list[StableId] = Field(default_factory=list)
    possible_new_failures: list[str] = Field(default_factory=list)
    created_at: UtcTimestamp


class IssueClusterV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.issue-cluster/v1"] = "dev.gauntlet.issue-cluster/v1"
    issue_id: StableId
    fingerprint: NonEmptyStr
    fingerprint_inputs: dict[str, str] = Field(default_factory=dict)
    observations: list[StableId] = Field(default_factory=list)
    counterexamples: list[StableId] = Field(default_factory=list)
    label: str | None = None
    label_source: Literal["deterministic", "host-agent"] | None = None
    status: Literal["open", "closed", "reopened"] = "open"
    severity: Literal["critical", "major", "minor", "info"] = "minor"
    created_at: UtcTimestamp


# ---------------------------------------------------------------------------
# Experiments and promotion
# ---------------------------------------------------------------------------


class CampaignV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.campaign/v1"] = "dev.gauntlet.campaign/v1"
    campaign_id: StableId
    objective: NonEmptyStr
    spec_digest: Digest
    baseline: GitRefV1
    target_branch: NonEmptyStr
    budget: BudgetV1
    stop_policy: StopPolicyV1
    state: CampaignState = CampaignState.DRAFT
    stop_reason: StopReason | None = None
    spec_discovery_only: bool = False
    created_at: UtcTimestamp
    updated_at: UtcTimestamp | None = None


class HypothesisV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.hypothesis/v1"] = "dev.gauntlet.hypothesis/v1"
    hypothesis_id: StableId
    campaign_id: StableId
    statement: NonEmptyStr
    falsifier: NonEmptyStr
    seam: ActionSeam
    diagnosis_id: StableId | None = None
    created_at: UtcTimestamp


class CandidateV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.candidate/v1"] = "dev.gauntlet.candidate/v1"
    candidate_id: StableId
    experiment_id: StableId
    branch: NonEmptyStr
    commit: Annotated[str, Field(pattern=r"^[0-9a-f]{7,64}$")]
    artifact_digests: list[DigestRefV1] = Field(default_factory=list)
    environment: EnvironmentRefV1 | None = None
    created_at: UtcTimestamp


class ExperimentV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.experiment/v1"] = "dev.gauntlet.experiment/v1"
    experiment_id: StableId
    campaign_id: StableId
    hypothesis_id: StableId
    seam: ActionSeam
    baseline: GitRefV1
    fork_event: NonEmptyStr
    permitted_globs: list[NonEmptyStr] = Field(default_factory=list)
    frozen_surfaces: list[str] = Field(default_factory=list)
    branch: NonEmptyStr
    worktree_manifest: str | None = None
    commits: list[str] = Field(default_factory=list)
    commands: list[list[str]] = Field(default_factory=list)
    environment: EnvironmentRefV1 | None = None
    seeds: dict[str, int] = Field(default_factory=dict)
    resource_usage: dict[str, float] = Field(default_factory=dict)
    timeout_seconds: Annotated[int, Field(ge=1)] = 3600
    observation_refs: list[StableId] = Field(default_factory=list)
    evaluation_refs: list[StableId] = Field(default_factory=list)
    comparison_ref: StableId | None = None
    counterexamples_fixed: list[StableId] = Field(default_factory=list)
    counterexamples_retained: list[StableId] = Field(default_factory=list)
    counterexamples_introduced: list[StableId] = Field(default_factory=list)
    status: ExperimentStatus = ExperimentStatus.PROPOSED
    status_rationale: str | None = None
    smoke_only: bool = False
    created_at: UtcTimestamp
    updated_at: UtcTimestamp | None = None


class MetricResultV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.metric-result/v1"] = "dev.gauntlet.metric-result/v1"
    metric: NonEmptyStr
    value: float
    unit: str | None = None
    n: Annotated[int, Field(ge=0)] | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    confidence_level: Annotated[float, Field(gt=0.0, lt=1.0)] | None = None


class EvaluationResultV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.evaluation-result/v1"] = (
        "dev.gauntlet.evaluation-result/v1"
    )
    evaluation_id: StableId
    evaluator_id: StableId
    evaluator_version: NonEmptyStr
    candidate_id: StableId
    split: SplitKind
    passed: bool | None = None
    metrics: list[MetricResultV1] = Field(default_factory=list)
    raw_output_digest: Digest | None = None
    abstained: bool = False
    started_at: UtcTimestamp
    finished_at: UtcTimestamp | None = None


class ComparisonV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.comparison/v1"] = "dev.gauntlet.comparison/v1"
    comparison_id: StableId
    baseline_candidate: StableId
    candidate: StableId
    paired: bool = True
    deltas: list[MetricResultV1] = Field(default_factory=list)
    protected_regressions: dict[str, float] = Field(default_factory=dict)
    pareto_dominates: bool | None = None
    counterexample_deltas: dict[str, int] = Field(default_factory=dict)
    inconclusive: bool = False
    seed: int | None = None
    method: str | None = None
    created_at: UtcTimestamp


class PromotionPlanV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.promotion-plan/v1"] = "dev.gauntlet.promotion-plan/v1"
    plan_id: StableId
    campaign_id: StableId
    candidate_id: StableId
    candidate_commit: Annotated[str, Field(pattern=r"^[0-9a-f]{7,64}$")]
    graph_plan: dict[str, Any] = Field(default_factory=dict)
    graph_conflicts: list[str] = Field(default_factory=list)
    git_applicable: bool
    git_conflicts: list[str] = Field(default_factory=list)
    frozen_surface_violations: list[str] = Field(default_factory=list)
    integration_commit: str | None = None
    integrity_checks: dict[str, bool] = Field(default_factory=dict)
    created_at: UtcTimestamp


class GateCheckV1(GauntletModel):
    gate: NonEmptyStr
    passed: bool
    detail: str | None = None


class PromotionDecisionV1(GauntletModel):
    """Binds the exact tested commit/digests; no post-hoc substitution."""

    schema_version: Literal["dev.gauntlet.promotion-decision/v1"] = (
        "dev.gauntlet.promotion-decision/v1"
    )
    decision_id: StableId
    plan_id: StableId
    campaign_id: StableId
    candidate_id: StableId
    candidate_commit: Annotated[str, Field(pattern=r"^[0-9a-f]{7,64}$")]
    artifact_digests: list[DigestRefV1] = Field(default_factory=list)
    outcome: Literal["accepted", "rejected", "inconclusive"]
    gates: list[GateCheckV1] = Field(default_factory=list)
    evidence: list[EvidenceRefV1] = Field(default_factory=list)
    graph_event_ids: list[str] = Field(default_factory=list)
    decided_at: UtcTimestamp


class ReleaseDecisionV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.release-decision/v1"] = "dev.gauntlet.release-decision/v1"
    decision_id: StableId
    release_plan_id: StableId
    promotion_decision_id: StableId
    outcome: Literal["approved", "rejected", "completed", "reconciling"]
    approvals: list[VoteV1] = Field(default_factory=list)
    external_ids: dict[str, str] = Field(default_factory=dict)
    decided_at: UtcTimestamp


class HandoffV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.handoff/v1"] = "dev.gauntlet.handoff/v1"
    handoff_id: StableId
    campaign_id: StableId
    objective: NonEmptyStr
    spec_digest: Digest
    stop_rules: list[str] = Field(default_factory=list)
    current_branches: list[str] = Field(default_factory=list)
    latest_accepted: str | None = None
    latest_rejected: str | None = None
    unresolved_counterexamples: list[StableId] = Field(default_factory=list)
    pending_approvals: list[StableId] = Field(default_factory=list)
    legal_next_actions: list[str] = Field(default_factory=list)
    redacted: bool = True
    created_at: UtcTimestamp


# ---------------------------------------------------------------------------
# Provenance, bundles, portable events, trajectories
# ---------------------------------------------------------------------------


class ProvenanceRecordV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.provenance/v1"] = "dev.gauntlet.provenance/v1"
    record_id: StableId
    entities: list[ArtifactRefV1] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    agents: list[ActorRefV1] = Field(default_factory=list)
    relations: list[dict[str, str]] = Field(default_factory=list)
    signed: bool = False
    signature_ref: str | None = None
    created_at: UtcTimestamp


class BundleEntryV1(GauntletModel):
    path: NonEmptyStr
    media_type: NonEmptyStr
    digest: DigestRefV1


class BundleManifestV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.bundle/v1"] = "dev.gauntlet.bundle/v1"
    bundle_id: StableId
    campaign_id: StableId | None = None
    entries: Annotated[list[BundleEntryV1], Field(min_length=1)]
    spec_digest: Digest | None = None
    policy_digests: dict[str, str] = Field(default_factory=dict)
    provenance_ref: StableId | None = None
    redaction_policy_applied: bool = True
    created_at: UtcTimestamp


class GauntletCloudEventV1(GauntletModel):
    """Portable export envelope; internal truth stays in ActiveGraph."""

    schema_version: Literal["dev.gauntlet.cloudevent/v1"] = "dev.gauntlet.cloudevent/v1"
    specversion: Literal["1.0"] = "1.0"
    id: NonEmptyStr
    source: NonEmptyStr
    type: NonEmptyStr
    time: UtcTimestamp
    subject: str | None = None
    datacontenttype: str = "application/json"
    data: dict[str, Any] = Field(default_factory=dict)


class TrajectoryStepV1(GauntletModel):
    step_id: StableId
    state_digest: Digest | None = None
    action: NonEmptyStr
    observation_ref: StableId | None = None
    reward: float | None = None
    next_state_digest: Digest | None = None
    causal_ids: list[str] = Field(default_factory=list)


class TrajectoryV1(GauntletModel):
    schema_version: Literal["dev.gauntlet.trajectory/v1"] = "dev.gauntlet.trajectory/v1"
    trajectory_id: StableId
    campaign_id: StableId
    verified: bool = False
    steps: list[TrajectoryStepV1] = Field(default_factory=list)
    created_at: UtcTimestamp


# ---------------------------------------------------------------------------
# Durable workflows (Microsoft Agent Framework declarative YAML)
# ---------------------------------------------------------------------------


class WorkflowStepV1(GauntletModel):
    """One gauntlet CLI step inside a generated declarative workflow.

    Steps are expression-free by contract: the generated YAML uses only
    literal arguments, because PowerFx expression evaluation requires a
    dotnet runtime and, more importantly, because the Python control plane
    (durable ``.gauntlet/`` state) is the single source of data flow.
    """

    step_id: Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]*$")]
    display_name: NonEmptyStr
    command: Annotated[list[NonEmptyStr], Field(min_length=1)]
    action_class: ActionClass = ActionClass.R0
    require_approval: bool = False
    max_retries: Annotated[int, Field(ge=0, le=10)] = 0
    retry_on_exit_codes: list[int] = Field(default_factory=lambda: [8])
    on_gate_failure: Literal["end", "continue"] = "end"
    timeout_seconds: Annotated[int, Field(ge=1)] = 600


class WorkflowPlanV1(GauntletModel):
    """Typed source of truth for a generated .gauntlet/workflows/ YAML file.

    The YAML is a derived artifact: its digest binds to this plan's digest,
    so hand edits are detected as drift instead of silently overwritten.
    Self-healing repairs patch the plan (structured data), re-promote it,
    and regenerate the YAML.
    """

    schema_version: Literal["dev.gauntlet.workflow-plan/v1"] = "dev.gauntlet.workflow-plan/v1"
    plan_id: StableId
    workflow_name: Annotated[str, Field(pattern=r"^[a-z][a-z0-9-]*$")]
    description: NonEmptyStr
    profile: NonEmptyStr = "software"
    inputs: dict[str, str] = Field(default_factory=dict)
    steps: Annotated[list[WorkflowStepV1], Field(min_length=1)]
    checkpoint: bool = True
    generated_by: NonEmptyStr = "gauntlet workflow generate"
    parent_plan_digest: Digest | None = None
    repairs_applied: list[StableId] = Field(default_factory=list)
    created_at: UtcTimestamp

    @field_validator("steps")
    @classmethod
    def _unique_step_ids(cls, steps: list[WorkflowStepV1]) -> list[WorkflowStepV1]:
        seen: set[str] = set()
        for step in steps:
            if step.step_id in seen:
                raise ValueError(f"duplicate step_id: {step.step_id}")
            seen.add(step.step_id)
        return steps


# Registry used by schema generation and drift checks.
PERSISTED_MODELS: tuple[type[GauntletModel], ...] = (
    DigestRefV1,
    ArtifactRefV1,
    ActorRefV1,
    SourceRefV1,
    ToolRefV1,
    ModelRefV1,
    EnvironmentRefV1,
    GitRefV1,
    EvidenceRefV1,
    ProjectConfigV1,
    GauntletSpecV1,
    ReferencePackV1,
    ReferenceEntryV1,
    RepresentationProfileV1,
    ArtifactNodeV1,
    TransformEdgeV1,
    EvaluatorManifestV1,
    DatasetManifestV1,
    BudgetV1,
    StopPolicyV1,
    ActionIntentV1,
    AuthorityDecisionV1,
    VoteV1,
    EffectPlanV1,
    EffectResultV1,
    ReconciliationRecordV1,
    ReleasePlanV1,
    ObservationV1,
    BeliefV1,
    CounterexampleV1,
    DiagnosisV1,
    InterventionV1,
    IssueClusterV1,
    CampaignV1,
    HypothesisV1,
    ExperimentV1,
    CandidateV1,
    EvaluationResultV1,
    MetricResultV1,
    ComparisonV1,
    PromotionPlanV1,
    PromotionDecisionV1,
    ReleaseDecisionV1,
    HandoffV1,
    ProvenanceRecordV1,
    BundleManifestV1,
    GauntletCloudEventV1,
    TrajectoryV1,
    WorkflowPlanV1,
)

__all__ = [name for name in dir() if name.endswith("V1")] + [
    "GauntletModel",
    "PERSISTED_MODELS",
    "ReplayMode",
]
