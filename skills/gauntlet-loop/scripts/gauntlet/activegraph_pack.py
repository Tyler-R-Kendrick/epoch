"""The Gauntlet ActiveGraph pack: object types, relation types, behaviors.

This module owns the *graph node* schemas (slim shapes: stable IDs, digests,
state), while :mod:`gauntlet.models` owns the persisted ledger contracts.
Both share the vocabularies from :mod:`gauntlet.constants`.

``build_pack()`` is the ``activegraph.packs`` entry point declared in
``pyproject.toml``. The pack is deterministic by default: no behavior calls
an LLM, reads a clock beyond the event timestamps, or performs I/O.

Validation seams
----------------
- Object schemas are enforced by ActiveGraph itself (``PackSchemaViolation``
  on ``graph.add_object`` with nonconforming data).
- Relation source/target constraints are enforced by ActiveGraph for every
  relation type declared here (verified against activegraph 1.10.0).
- Domain state machines (intent, belief, experiment, campaign) are enforced
  by the deterministic behaviors below. An *invalid* transition never mutates
  the graph; it emits a durable ``gauntlet.<domain>.rejected`` event instead,
  so bad proposals become evidence rather than crashes.

Event grammar
-------------
Behaviors react to namespaced ``gauntlet.*`` seed events emitted by
:mod:`gauntlet.activegraph_adapter` (see that module for the emit mechanism)
and emit derived ``gauntlet.*`` events of their own. Derived events that a
portable ledger writer should consume are re-emitted as
``gauntlet.ledger.project`` events carrying a CloudEvents type from
:data:`gauntlet.constants.CLOUDEVENT_TYPES`.
"""

from __future__ import annotations

from collections.abc import Callable
from fnmatch import fnmatch
from typing import Any, Final, cast

import activegraph.packs as ag_packs
from pydantic import BaseModel, ConfigDict, Field

from gauntlet.canonical_json import digest_value
from gauntlet.constants import (
    ACTION_CLASS_ORDER,
    BELIEF_TRANSITIONS,
    INTENT_TRANSITIONS,
    ActionClass,
    ArtifactRole,
    BeliefState,
    CampaignState,
    EffectClass,
    EvaluatorRole,
    ExperimentStatus,
    IndependenceLevel,
    IntentState,
    SplitKind,
    StopReason,
    VoteDecision,
    VoterKind,
)

PACK_NAME: Final = "gauntlet"
PACK_VERSION: Final = "0.1.0"

# ---------------------------------------------------------------------------
# Graph node schemas (slim shapes; ledger documents live in gauntlet.models)
# ---------------------------------------------------------------------------


class NodeSchema(BaseModel):
    """Base for graph node payloads: strict, JSON-native, no extras."""

    model_config = ConfigDict(extra="forbid")


class ProjectNode(NodeSchema):
    project_id: str
    skill_contract: str = "dev.gauntlet/v1"
    config_digest: str | None = None


class SpecNode(NodeSchema):
    spec_id: str
    digest: str
    frozen: bool = False
    frozen_surfaces: list[str] = Field(default_factory=list)


class ReferenceNode(NodeSchema):
    reference_id: str
    kind: str
    digest: str
    verified: bool = False


class CampaignNode(NodeSchema):
    campaign_id: str
    objective: str
    spec_digest: str
    state: CampaignState = CampaignState.DRAFT
    stop_reason: StopReason | None = None
    max_experiments: int | None = None
    max_wall_clock_seconds: int | None = None
    max_evaluator_runs: int | None = None
    max_cost_usd: float | None = None
    plateau_window: int | None = None


class ArtifactNode(NodeSchema):
    artifact_id: str
    role: ArtifactRole
    digest: str
    path: str | None = None
    representation: str | None = None


class EvaluatorNode(NodeSchema):
    evaluator_id: str
    roles: list[EvaluatorRole] = Field(default_factory=list)
    independence: IndependenceLevel = IndependenceLevel.L0
    frozen_for_promotion: bool = False
    version: str = "0.1.0"


class DatasetNode(NodeSchema):
    dataset_id: str
    split: SplitKind
    sealed: bool = False
    case_count: int = 0
    digest: str | None = None


class ObservationNode(NodeSchema):
    observation_id: str
    scope: str
    raw_digest: str
    violated_rule: str | None = None
    subject_ref: str | None = None


class BeliefNode(NodeSchema):
    belief_id: str
    statement: str
    state: BeliefState = BeliefState.RAW
    confidence: float | None = None


class IssueNode(NodeSchema):
    issue_id: str
    fingerprint: str
    status: str = "open"
    severity: str = "minor"
    observation_ids: list[str] = Field(default_factory=list)
    counterexample_ids: list[str] = Field(default_factory=list)


class CounterexampleNode(NodeSchema):
    counterexample_id: str
    candidate_id: str
    scope: str
    violated_rule: str
    severity: str
    status: str = "open"


class DiagnosisNode(NodeSchema):
    diagnosis_id: str
    hypothesis: str
    falsifier: str
    confidence: float
    claim_level: str
    revoked: bool = False


class InterventionNode(NodeSchema):
    intervention_id: str
    diagnosis_id: str
    primary_seam: str
    expected_mechanism: str
    rollback_plan: str


class IntentNode(NodeSchema):
    intent_id: str
    capability: str
    action_class: str
    effect_class: EffectClass
    state: IntentState = IntentState.PROPOSED
    authority_decision: str | None = None
    payload_digest: str | None = None


class VoteNode(NodeSchema):
    vote_id: str
    intent_id: str
    voter_kind: VoterKind
    decision: VoteDecision
    reason: str
    scope: str | None = None


class EffectNode(NodeSchema):
    effect_id: str
    intent_id: str
    outcome: str
    result_digest: str | None = None


class ExperimentNode(NodeSchema):
    experiment_id: str
    campaign_id: str
    status: ExperimentStatus = ExperimentStatus.PROPOSED
    seam: str | None = None
    branch: str | None = None
    fork_event: str | None = None


class CandidateNode(NodeSchema):
    candidate_id: str
    experiment_id: str
    branch: str
    commit: str


class DecisionNode(NodeSchema):
    decision_id: str
    kind: str
    outcome: str
    subject_id: str
    reason: str | None = None


class PromotionNode(NodeSchema):
    promotion_id: str
    campaign_id: str
    candidate_id: str
    state: str = "pending"
    gates: dict[str, bool] = Field(default_factory=dict)
    gate_details: dict[str, str] = Field(default_factory=dict)


class ReleaseNode(NodeSchema):
    release_id: str
    promotion_id: str
    outcome: str
    external_ids: dict[str, str] = Field(default_factory=dict)


class BundleNode(NodeSchema):
    bundle_id: str
    digest: str
    campaign_id: str | None = None
    entry_count: int = 0


class HandoffNode(NodeSchema):
    handoff_id: str
    campaign_id: str
    unresolved_counterexamples: list[str] = Field(default_factory=list)
    pending_approvals: list[str] = Field(default_factory=list)
    open_issues: list[str] = Field(default_factory=list)


class RuntimeVersionsNode(NodeSchema):
    """Schema/projector version record kept in the graph itself."""

    gauntlet_version: str
    activegraph_version: str
    skill_contract: str = "dev.gauntlet/v1"
    projector_version: str


_OBJECT_SCHEMAS: Final[dict[str, type[NodeSchema]]] = {
    "project": ProjectNode,
    "spec": SpecNode,
    "reference": ReferenceNode,
    "campaign": CampaignNode,
    "artifact": ArtifactNode,
    "evaluator": EvaluatorNode,
    "dataset": DatasetNode,
    "observation": ObservationNode,
    "belief": BeliefNode,
    "issue": IssueNode,
    "counterexample": CounterexampleNode,
    "diagnosis": DiagnosisNode,
    "intervention": InterventionNode,
    "intent": IntentNode,
    "vote": VoteNode,
    "effect": EffectNode,
    "experiment": ExperimentNode,
    "candidate": CandidateNode,
    "decision": DecisionNode,
    "promotion": PromotionNode,
    "release": ReleaseNode,
    "bundle": BundleNode,
    "handoff": HandoffNode,
    "runtime_versions": RuntimeVersionsNode,
}

OBJECT_TYPE_NAMES: Final = tuple(_OBJECT_SCHEMAS)

# ---------------------------------------------------------------------------
# Relation types (source/target constraints enforced by ActiveGraph)
# ---------------------------------------------------------------------------

_RELATION_SPECS: Final[dict[str, tuple[tuple[str, ...], tuple[str, ...]]]] = {
    "derived_from": (("artifact", "dataset", "bundle"), ("artifact", "dataset", "reference")),
    "produced_by": (("artifact", "observation"), ("effect", "experiment", "evaluator")),
    "observed_in": (("observation",), ("effect", "experiment", "candidate")),
    "supports": (("observation", "belief"), ("belief", "diagnosis")),
    "contradicts": (("observation", "belief", "counterexample"), ("belief", "diagnosis")),
    "depends_on": (("belief",), ("observation", "belief")),
    "blocks": (("issue", "counterexample"), ("promotion", "experiment", "campaign")),
    "violates": (("counterexample", "observation"), ("spec",)),
    "localizes": (("diagnosis", "observation"), ("artifact", "issue")),
    "minimizes": (("counterexample",), ("counterexample",)),
    "explains": (("diagnosis",), ("issue", "counterexample", "observation")),
    "falsifies": (("observation", "counterexample"), ("diagnosis", "belief")),
    "tests": (("experiment", "evaluator"), ("diagnosis", "intervention", "candidate")),
    "repairs": (("intervention",), ("issue", "counterexample", "diagnosis")),
    "regresses": (("candidate",), ("counterexample", "issue")),
    "evaluated_by": (("candidate", "experiment"), ("evaluator",)),
    "supersedes": (
        ("spec", "belief", "candidate", "decision", "evaluator", "experiment"),
        ("spec", "belief", "candidate", "decision", "evaluator", "experiment"),
    ),
    "revokes": (("decision",), ("belief", "decision")),
    "promoted_from": (("promotion",), ("candidate", "experiment")),
    "released_as": (("release",), ("promotion", "artifact", "bundle")),
    "settles": (("effect", "decision", "vote"), ("intent",)),
    "caused_by": (("observation", "issue", "effect"), ("effect", "intent", "intervention")),
    "forked_from": (
        ("experiment", "candidate", "campaign"),
        ("campaign", "experiment", "candidate"),
    ),
}

RELATION_TYPE_NAMES: Final = tuple(_RELATION_SPECS)

# ---------------------------------------------------------------------------
# Domain state machines not owned by gauntlet.constants
# ---------------------------------------------------------------------------

EXPERIMENT_TRANSITIONS: Final[dict[ExperimentStatus, frozenset[ExperimentStatus]]] = {
    ExperimentStatus.PROPOSED: frozenset(
        {ExperimentStatus.BLOCKED, ExperimentStatus.RUNNING, ExperimentStatus.SUPERSEDED}
    ),
    ExperimentStatus.BLOCKED: frozenset(
        {ExperimentStatus.PROPOSED, ExperimentStatus.RUNNING, ExperimentStatus.SUPERSEDED}
    ),
    ExperimentStatus.RUNNING: frozenset(
        {
            ExperimentStatus.KEEP,
            ExperimentStatus.DISCARD,
            ExperimentStatus.CRASH,
            ExperimentStatus.INCONCLUSIVE,
        }
    ),
    ExperimentStatus.KEEP: frozenset({ExperimentStatus.SUPERSEDED}),
    ExperimentStatus.DISCARD: frozenset(),
    ExperimentStatus.CRASH: frozenset(),
    ExperimentStatus.INCONCLUSIVE: frozenset({ExperimentStatus.SUPERSEDED}),
    ExperimentStatus.SUPERSEDED: frozenset(),
}

CAMPAIGN_TRANSITIONS: Final[dict[CampaignState, frozenset[CampaignState]]] = {
    CampaignState.DRAFT: frozenset({CampaignState.ACTIVE, CampaignState.STOPPED}),
    CampaignState.ACTIVE: frozenset({CampaignState.CHECKPOINTED, CampaignState.STOPPED}),
    CampaignState.CHECKPOINTED: frozenset({CampaignState.ACTIVE, CampaignState.STOPPED}),
    CampaignState.STOPPED: frozenset(),
}

# Authority decision vocabulary produced by the intent authority behavior.
AUTHORITY_AUTO_APPROVE: Final = "auto_approve"
AUTHORITY_REQUIRE_APPROVAL: Final = "require_approval"
AUTHORITY_REQUIRE_GOVERNANCE: Final = "require_governance"
AUTHORITY_FAIL_CLOSED: Final = "fail_closed"

# ---------------------------------------------------------------------------
# Behavior plumbing
# ---------------------------------------------------------------------------

BehaviorFn = Callable[[Any, Any, Any], None]


def _behavior(name: str, on: list[str]) -> Callable[[BehaviorFn], Any]:
    """Typed wrapper around the untyped pack-scoped behavior decorator.

    ``activegraph.packs.behavior`` (not the global ``activegraph.behavior``)
    is required so the behavior is declared for pack membership instead of
    being registered globally.
    """
    return cast(
        "Callable[[BehaviorFn], Any]",
        ag_packs.behavior(name=name, on=on),
    )


def _find(ctx: Any, node_type: str, id_field: str, node_id: str) -> Any | None:
    matches = ctx.view.objects(node_type, where={f"data.{id_field}": node_id})
    return matches[0] if matches else None


def _reject(graph: Any, domain: str, reason: str, **details: Any) -> None:
    graph.emit(f"gauntlet.{domain}.rejected", {"reason": reason, **details})


# ---------------------------------------------------------------------------
# Behaviors
# ---------------------------------------------------------------------------


@_behavior("gauntlet.node_recorder", on=["gauntlet.node.recorded"])
def node_recorder(event: Any, graph: Any, ctx: Any) -> None:
    """Generic append-object/relation seam used by the adapter.

    Payload: ``{"node_type": ..., "data": {...}, "relations": [
    {"source": <graph id or "self">, "target": ..., "type": ...}, ...]}``.
    Schema and relation constraints are enforced by the pack registration.
    """
    node_type = event.payload.get("node_type")
    data = event.payload.get("data")
    if node_type not in _OBJECT_SCHEMAS or not isinstance(data, dict):
        _reject(graph, "node", f"unknown node_type or bad data: {node_type!r}")
        return
    obj = graph.add_object(node_type, data)
    for rel in event.payload.get("relations", []):
        source = obj.id if rel.get("source") == "self" else rel["source"]
        target = obj.id if rel.get("target") == "self" else rel["target"]
        graph.add_relation(source, target, rel["type"])


@_behavior("gauntlet.record_versions", on=["gauntlet.runtime.versions"])
def record_versions(event: Any, graph: Any, ctx: Any) -> None:
    """Record gauntlet/activegraph schema+projector versions as a node."""
    existing = ctx.view.objects("runtime_versions")
    data = {
        "gauntlet_version": event.payload.get("gauntlet_version", "0.0.0"),
        "activegraph_version": event.payload.get("activegraph_version", "0.0.0"),
        "skill_contract": event.payload.get("skill_contract", "dev.gauntlet/v1"),
        "projector_version": event.payload.get("projector_version", "0"),
    }
    if existing:
        graph.patch_object(existing[0].id, data)
    else:
        graph.add_object("runtime_versions", data)


@_behavior("gauntlet.spec_freeze", on=["gauntlet.spec.frozen"])
def spec_freeze(event: Any, graph: Any, ctx: Any) -> None:
    """Spec freeze and digest validation.

    The declared digest must equal the canonical digest of the submitted
    document; a frozen spec is immutable (re-freezing is rejected).
    """
    payload = event.payload
    spec_id = payload.get("spec_id")
    document = payload.get("document")
    declared = payload.get("declared_digest")
    if not spec_id or document is None or not declared:
        _reject(graph, "spec", "spec_id, document, and declared_digest are required")
        return
    actual = digest_value(document)
    if actual != declared:
        _reject(
            graph,
            "spec",
            "declared digest does not match canonical document digest",
            spec_id=spec_id,
            declared_digest=declared,
            actual_digest=actual,
        )
        return
    existing = _find(ctx, "spec", "spec_id", spec_id)
    if existing is not None and existing.data.get("frozen"):
        _reject(
            graph,
            "spec",
            "spec is already frozen; freeze a superseding spec instead",
            spec_id=spec_id,
        )
        return
    surfaces = list(payload.get("frozen_surfaces", []))
    if existing is None:
        graph.add_object(
            "spec",
            {"spec_id": spec_id, "digest": actual, "frozen": True, "frozen_surfaces": surfaces},
        )
    else:
        graph.patch_object(
            existing.id, {"digest": actual, "frozen": True, "frozen_surfaces": surfaces}
        )
    graph.emit("gauntlet.spec.frozen_validated", {"spec_id": spec_id, "spec_digest": actual})


@_behavior("gauntlet.intent_authority", on=["gauntlet.intent.proposed"])
def intent_authority(event: Any, graph: Any, ctx: Any) -> None:
    """Create the intent node and evaluate its authority class fail-closed."""
    payload = event.payload
    intent_id = payload.get("intent_id")
    if not intent_id:
        _reject(graph, "intent", "intent_id is required")
        return
    if _find(ctx, "intent", "intent_id", intent_id) is not None:
        _reject(graph, "intent", "intent already exists", intent_id=intent_id)
        return
    raw_class = payload.get("action_class")
    ceiling_raw = payload.get("authority_ceiling", ActionClass.R1.value)
    try:
        action_class = ActionClass(raw_class)
        ceiling = ActionClass(ceiling_raw)
    except ValueError:
        action_class = None
        ceiling = ActionClass.R1
    if action_class is None:
        decision = AUTHORITY_FAIL_CLOSED
        reason = f"invalid or missing action class {raw_class!r}; failing closed"
    elif action_class is ActionClass.R4:
        decision = AUTHORITY_REQUIRE_GOVERNANCE
        reason = "R4 governance mutations always use the governance gate"
    elif action_class is ActionClass.R3:
        decision = AUTHORITY_REQUIRE_APPROVAL
        reason = "R3 outward effects always require approval"
    elif ACTION_CLASS_ORDER[action_class] <= ACTION_CLASS_ORDER[ceiling]:
        decision = AUTHORITY_AUTO_APPROVE
        reason = f"{action_class} is within the automatic ceiling {ceiling}"
    else:
        decision = AUTHORITY_REQUIRE_APPROVAL
        reason = f"{action_class} is above the automatic ceiling {ceiling}"
    try:
        effect_class = EffectClass(payload.get("effect_class", EffectClass.UNKNOWN.value))
    except ValueError:
        effect_class = EffectClass.UNKNOWN
    graph.add_object(
        "intent",
        {
            "intent_id": intent_id,
            "capability": payload.get("capability", "unknown"),
            "action_class": raw_class if isinstance(raw_class, str) else "invalid",
            "effect_class": effect_class.value,
            "state": IntentState.PROPOSED.value,
            "authority_decision": decision,
            "payload_digest": payload.get("payload_digest"),
        },
    )
    graph.emit(
        "gauntlet.intent.authority_evaluated",
        {"intent_id": intent_id, "decision": decision, "reason": reason},
    )


@_behavior("gauntlet.intent_quorum", on=["gauntlet.intent.vote_cast"])
def intent_quorum(event: Any, graph: Any, ctx: Any) -> None:
    """Record a vote and drive the quorum/decision transition.

    Quorum policy (deterministic, stricter-only configurable elsewhere):
    any reject aborts; ``auto_approve`` commits on a deterministic-policy
    approve; ``require_approval`` additionally needs a human approve;
    ``require_governance`` needs a human approve with governance scope.
    An LLM semantic vote can veto but never counts toward approval, and a
    fail-closed intent never commits.
    """
    payload = event.payload
    intent_id = payload.get("intent_id")
    intent = _find(ctx, "intent", "intent_id", intent_id) if intent_id else None
    if intent is None:
        _reject(graph, "vote", "vote references an unknown intent", intent_id=intent_id)
        return
    state = IntentState(intent.data["state"])
    if state not in (IntentState.PROPOSED, IntentState.VOTING):
        _reject(
            graph,
            "vote",
            f"intent is not accepting votes in state {state.value}",
            intent_id=intent_id,
        )
        return
    try:
        voter_kind = VoterKind(payload.get("voter_kind"))
        decision = VoteDecision(payload.get("decision"))
    except ValueError:
        _reject(graph, "vote", "invalid voter_kind or decision", intent_id=intent_id)
        return
    vote = graph.add_object(
        "vote",
        {
            "vote_id": payload.get("vote_id", f"vote:{intent_id}"),
            "intent_id": intent_id,
            "voter_kind": voter_kind.value,
            "decision": decision.value,
            "reason": payload.get("reason", ""),
            "scope": payload.get("scope"),
        },
    )
    graph.add_relation(vote.id, intent.id, "settles")
    if state is IntentState.PROPOSED:
        graph.patch_object(intent.id, {"state": IntentState.VOTING.value})

    votes = [o.data for o in ctx.view.objects("vote", where={"data.intent_id": intent_id})] + [
        vote.data
    ]
    if any(v["decision"] == VoteDecision.REJECT.value for v in votes):
        graph.patch_object(intent.id, {"state": IntentState.ABORTED.value})
        graph.emit("gauntlet.intent.decided", {"intent_id": intent_id, "outcome": "aborted"})
        return
    authority = intent.data.get("authority_decision")
    if authority == AUTHORITY_FAIL_CLOSED:
        _reject(graph, "vote", "fail-closed intent can never be committed", intent_id=intent_id)
        return
    policy_ok = any(
        v["voter_kind"] == VoterKind.DETERMINISTIC_POLICY.value
        and v["decision"] == VoteDecision.APPROVE.value
        for v in votes
    )
    human_ok = any(
        v["voter_kind"] == VoterKind.HUMAN_APPROVAL.value
        and v["decision"] == VoteDecision.APPROVE.value
        for v in votes
    )
    governance_ok = any(
        v["voter_kind"] == VoterKind.HUMAN_APPROVAL.value
        and v["decision"] == VoteDecision.APPROVE.value
        and v.get("scope") == "governance"
        for v in votes
    )
    committed = policy_ok and (
        (authority == AUTHORITY_AUTO_APPROVE)
        or (authority == AUTHORITY_REQUIRE_APPROVAL and human_ok)
        or (authority == AUTHORITY_REQUIRE_GOVERNANCE and governance_ok)
    )
    if committed:
        graph.patch_object(intent.id, {"state": IntentState.COMMITTED.value})
        graph.emit("gauntlet.intent.decided", {"intent_id": intent_id, "outcome": "committed"})


@_behavior("gauntlet.intent_transition", on=["gauntlet.intent.transition"])
def intent_transition(event: Any, graph: Any, ctx: Any) -> None:
    """Validate an explicit intent state transition against INTENT_TRANSITIONS."""
    payload = event.payload
    intent_id = payload.get("intent_id")
    intent = _find(ctx, "intent", "intent_id", intent_id) if intent_id else None
    if intent is None:
        _reject(graph, "intent", "unknown intent", intent_id=intent_id)
        return
    try:
        target = IntentState(payload.get("to_state"))
    except ValueError:
        _reject(
            graph,
            "intent",
            f"invalid target state {payload.get('to_state')!r}",
            intent_id=intent_id,
        )
        return
    current = IntentState(intent.data["state"])
    if target not in INTENT_TRANSITIONS[current]:
        _reject(
            graph,
            "intent",
            f"illegal transition {current.value} -> {target.value}",
            intent_id=intent_id,
        )
        return
    graph.patch_object(intent.id, {"state": target.value})


@_behavior("gauntlet.effect_settlement", on=["gauntlet.effect.result"])
def effect_settlement(event: Any, graph: Any, ctx: Any) -> None:
    """Effect result state transition: only an executing intent settles."""
    payload = event.payload
    intent_id = payload.get("intent_id")
    intent = _find(ctx, "intent", "intent_id", intent_id) if intent_id else None
    if intent is None:
        _reject(graph, "effect", "effect result references an unknown intent", intent_id=intent_id)
        return
    current = IntentState(intent.data["state"])
    try:
        outcome = IntentState(payload.get("outcome"))
    except ValueError:
        _reject(graph, "effect", f"invalid outcome {payload.get('outcome')!r}", intent_id=intent_id)
        return
    if current is not IntentState.EXECUTING or outcome not in INTENT_TRANSITIONS[current]:
        _reject(
            graph,
            "effect",
            f"intent in state {current.value} cannot settle to {outcome.value}",
            intent_id=intent_id,
        )
        return
    effect = graph.add_object(
        "effect",
        {
            "effect_id": payload.get("effect_id", f"effect:{intent_id}"),
            "intent_id": intent_id,
            "outcome": outcome.value,
            "result_digest": payload.get("result_digest"),
        },
    )
    graph.add_relation(effect.id, intent.id, "settles")
    graph.patch_object(intent.id, {"state": outcome.value})
    graph.emit(
        "gauntlet.effect.settled",
        {"intent_id": intent_id, "effect_id": effect.data["effect_id"], "outcome": outcome.value},
    )


@_behavior("gauntlet.observation_indexing", on=["gauntlet.observation.recorded"])
def observation_indexing(event: Any, graph: Any, ctx: Any) -> None:
    """Create the observation node and index it into an issue cluster."""
    payload = event.payload
    observation_id = payload.get("observation_id")
    scope = payload.get("scope")
    raw_digest = payload.get("raw_digest")
    if not observation_id or not scope or not raw_digest:
        _reject(graph, "observation", "observation_id, scope, and raw_digest are required")
        return
    violated_rule = payload.get("violated_rule")
    graph.add_object(
        "observation",
        {
            "observation_id": observation_id,
            "scope": scope,
            "raw_digest": raw_digest,
            "violated_rule": violated_rule,
            "subject_ref": payload.get("subject_ref"),
        },
    )
    if violated_rule is None:
        return
    fingerprint = digest_value({"scope": scope, "violated_rule": violated_rule})
    issue = None
    for candidate in ctx.view.objects("issue"):
        if candidate.data.get("fingerprint") == fingerprint:
            issue = candidate
            break
    if issue is None:
        issue = graph.add_object(
            "issue",
            {
                "issue_id": f"issue:{fingerprint.removeprefix('sha256:')[:16]}",
                "fingerprint": fingerprint,
                "status": "open",
                "severity": payload.get("severity", "minor"),
                "observation_ids": [observation_id],
                "counterexample_ids": [],
            },
        )
    else:
        observed = list(issue.data.get("observation_ids", []))
        if observation_id not in observed:
            observed.append(observation_id)
        graph.patch_object(issue.id, {"observation_ids": observed, "status": "open"})
    graph.emit(
        "gauntlet.issue.indexed",
        {
            "issue_id": issue.data["issue_id"],
            "fingerprint": fingerprint,
            "observation_id": observation_id,
        },
    )


@_behavior("gauntlet.belief_recorder", on=["gauntlet.belief.recorded"])
def belief_recorder(event: Any, graph: Any, ctx: Any) -> None:
    """Create a belief node plus its typed dependency relations."""
    payload = event.payload
    belief_id = payload.get("belief_id")
    statement = payload.get("statement")
    if not belief_id or not statement:
        _reject(graph, "belief", "belief_id and statement are required")
        return
    belief = graph.add_object(
        "belief",
        {
            "belief_id": belief_id,
            "statement": statement,
            "state": BeliefState.RAW.value,
            "confidence": payload.get("confidence"),
        },
    )
    for dep_id in payload.get("depends_on_observations", []):
        dep = _find(ctx, "observation", "observation_id", dep_id)
        if dep is not None:
            graph.add_relation(belief.id, dep.id, "depends_on")
    for dep_id in payload.get("depends_on_beliefs", []):
        dep = _find(ctx, "belief", "belief_id", dep_id)
        if dep is not None:
            graph.add_relation(belief.id, dep.id, "depends_on")


@_behavior("gauntlet.belief_transition", on=["gauntlet.belief.transition"])
def belief_transition(event: Any, graph: Any, ctx: Any) -> None:
    """Belief state machine plus revocation impact on dependent beliefs."""
    payload = event.payload
    belief_id = payload.get("belief_id")
    belief = _find(ctx, "belief", "belief_id", belief_id) if belief_id else None
    if belief is None:
        _reject(graph, "belief", "unknown belief", belief_id=belief_id)
        return
    try:
        target = BeliefState(payload.get("to_state"))
    except ValueError:
        _reject(
            graph,
            "belief",
            f"invalid target state {payload.get('to_state')!r}",
            belief_id=belief_id,
        )
        return
    current = BeliefState(belief.data["state"])
    if target not in BELIEF_TRANSITIONS[current]:
        _reject(
            graph,
            "belief",
            f"illegal transition {current.value} -> {target.value}",
            belief_id=belief_id,
        )
        return
    graph.patch_object(belief.id, {"state": target.value})
    if target not in (BeliefState.REVOKED, BeliefState.SUPERSEDED):
        return
    impacted: list[str] = []
    for rel in ctx.view.relations("depends_on"):
        if rel.target != belief.id:
            continue
        dependent = ctx.view.objects("belief", where={"id": rel.source})
        if not dependent:
            continue
        dep = dependent[0]
        dep_state = BeliefState(dep.data["state"])
        if BeliefState.QUARANTINED in BELIEF_TRANSITIONS[dep_state]:
            graph.patch_object(dep.id, {"state": BeliefState.QUARANTINED.value})
            impacted.append(dep.data["belief_id"])
    graph.emit(
        "gauntlet.belief.impacted",
        {"belief_id": belief_id, "to_state": target.value, "impacted_belief_ids": sorted(impacted)},
    )


@_behavior("gauntlet.experiment_recorder", on=["gauntlet.experiment.recorded"])
def experiment_recorder(event: Any, graph: Any, ctx: Any) -> None:
    payload = event.payload
    experiment_id = payload.get("experiment_id")
    campaign_id = payload.get("campaign_id")
    if not experiment_id or not campaign_id:
        _reject(graph, "experiment", "experiment_id and campaign_id are required")
        return
    campaign = _find(ctx, "campaign", "campaign_id", campaign_id)
    if campaign is None:
        _reject(
            graph,
            "experiment",
            "experiment references an unknown campaign",
            experiment_id=experiment_id,
            campaign_id=campaign_id,
        )
        return
    experiment = graph.add_object(
        "experiment",
        {
            "experiment_id": experiment_id,
            "campaign_id": campaign_id,
            "status": ExperimentStatus.PROPOSED.value,
            "seam": payload.get("seam"),
            "branch": payload.get("branch"),
            "fork_event": payload.get("fork_event"),
        },
    )
    graph.add_relation(experiment.id, campaign.id, "forked_from")


@_behavior("gauntlet.experiment_transition", on=["gauntlet.experiment.transition"])
def experiment_transition(event: Any, graph: Any, ctx: Any) -> None:
    """Experiment state-machine validation over EXPERIMENT_TRANSITIONS."""
    payload = event.payload
    experiment_id = payload.get("experiment_id")
    experiment = _find(ctx, "experiment", "experiment_id", experiment_id) if experiment_id else None
    if experiment is None:
        _reject(graph, "experiment", "unknown experiment", experiment_id=experiment_id)
        return
    try:
        target = ExperimentStatus(payload.get("to_status"))
    except ValueError:
        _reject(
            graph,
            "experiment",
            f"invalid target status {payload.get('to_status')!r}",
            experiment_id=experiment_id,
        )
        return
    current = ExperimentStatus(experiment.data["status"])
    if target not in EXPERIMENT_TRANSITIONS[current]:
        _reject(
            graph,
            "experiment",
            f"illegal transition {current.value} -> {target.value}",
            experiment_id=experiment_id,
        )
        return
    graph.patch_object(experiment.id, {"status": target.value})
    if target in (
        ExperimentStatus.KEEP,
        ExperimentStatus.DISCARD,
        ExperimentStatus.CRASH,
        ExperimentStatus.INCONCLUSIVE,
    ):
        graph.emit(
            "gauntlet.experiment.completed",
            {"experiment_id": experiment_id, "status": target.value},
        )


@_behavior("gauntlet.artifact_guard", on=["gauntlet.artifact.recorded"])
def artifact_guard(event: Any, graph: Any, ctx: Any) -> None:
    """Record an artifact and flag frozen-surface violations.

    A candidate-produced artifact whose path matches a frozen surface glob of
    any frozen spec raises a durable violation event and an open issue.
    """
    payload = event.payload
    artifact_id = payload.get("artifact_id")
    digest = payload.get("digest")
    role_raw = payload.get("role")
    try:
        role = ArtifactRole(role_raw)
    except ValueError:
        _reject(graph, "artifact", f"invalid artifact role {role_raw!r}", artifact_id=artifact_id)
        return
    if not artifact_id or not digest:
        _reject(graph, "artifact", "artifact_id and digest are required")
        return
    path = payload.get("path")
    graph.add_object(
        "artifact",
        {
            "artifact_id": artifact_id,
            "role": role.value,
            "digest": digest,
            "path": path,
            "representation": payload.get("representation"),
        },
    )
    if not path or not payload.get("candidate_produced", False):
        return
    for spec in ctx.view.objects("spec"):
        if not spec.data.get("frozen"):
            continue
        for surface in spec.data.get("frozen_surfaces", []):
            if fnmatch(path, surface):
                graph.emit(
                    "gauntlet.violation.frozen_surface",
                    {
                        "artifact_id": artifact_id,
                        "path": path,
                        "surface": surface,
                        "spec_id": spec.data["spec_id"],
                    },
                )
                return


@_behavior("gauntlet.evaluation_guard", on=["gauntlet.evaluation.recorded"])
def evaluation_guard(event: Any, graph: Any, ctx: Any) -> None:
    """Flag evaluator leakage: a promotion-split evaluation requires a
    promotion-frozen evaluator."""
    payload = event.payload
    evaluation_id = payload.get("evaluation_id")
    evaluator_id = payload.get("evaluator_id")
    candidate_id = payload.get("candidate_id")
    try:
        split = SplitKind(payload.get("split"))
    except ValueError:
        _reject(
            graph,
            "evaluation",
            f"invalid split {payload.get('split')!r}",
            evaluation_id=evaluation_id,
        )
        return
    evaluator = _find(ctx, "evaluator", "evaluator_id", evaluator_id) if evaluator_id else None
    if evaluator is None:
        _reject(
            graph,
            "evaluation",
            "evaluation references an unknown evaluator",
            evaluation_id=evaluation_id,
            evaluator_id=evaluator_id,
        )
        return
    candidate = _find(ctx, "candidate", "candidate_id", candidate_id) if candidate_id else None
    if candidate is not None:
        graph.add_relation(candidate.id, evaluator.id, "evaluated_by")
    if split is SplitKind.PROMOTION and not evaluator.data.get("frozen_for_promotion", False):
        graph.emit(
            "gauntlet.violation.evaluator_leakage",
            {
                "evaluation_id": evaluation_id,
                "evaluator_id": evaluator_id,
                "reason": "promotion-split evaluation by a non-frozen evaluator",
            },
        )


@_behavior("gauntlet.promotion_gate_check", on=["gauntlet.promotion.gate_checked"])
def promotion_gate_check(event: Any, graph: Any, ctx: Any) -> None:
    """Accumulate one gate result onto the (possibly new) promotion node."""
    payload = event.payload
    promotion_id = payload.get("promotion_id")
    gate = payload.get("gate")
    if not promotion_id or not gate or not isinstance(payload.get("passed"), bool):
        _reject(graph, "promotion", "promotion_id, gate, and boolean passed are required")
        return
    promotion = _find(ctx, "promotion", "promotion_id", promotion_id)
    passed: bool = payload["passed"]
    detail = str(payload.get("detail", ""))
    if promotion is None:
        graph.add_object(
            "promotion",
            {
                "promotion_id": promotion_id,
                "campaign_id": payload.get("campaign_id", "unknown"),
                "candidate_id": payload.get("candidate_id", "unknown"),
                "state": "pending",
                "gates": {gate: passed},
                "gate_details": {gate: detail},
            },
        )
        return
    if promotion.data.get("state") != "pending":
        _reject(graph, "promotion", "promotion is already decided", promotion_id=promotion_id)
        return
    gates = dict(promotion.data.get("gates", {}))
    details = dict(promotion.data.get("gate_details", {}))
    gates[gate] = passed
    details[gate] = detail
    graph.patch_object(promotion.id, {"gates": gates, "gate_details": details})


@_behavior("gauntlet.promotion_gate_aggregation", on=["gauntlet.promotion.requested"])
def promotion_gate_aggregation(event: Any, graph: Any, ctx: Any) -> None:
    """Aggregate recorded gates fail-closed into an accepted/rejected outcome."""
    payload = event.payload
    promotion_id = payload.get("promotion_id")
    promotion = _find(ctx, "promotion", "promotion_id", promotion_id) if promotion_id else None
    if promotion is None:
        _reject(
            graph,
            "promotion",
            "promotion has no recorded gates; failing closed",
            promotion_id=promotion_id,
        )
        return
    if promotion.data.get("state") != "pending":
        _reject(graph, "promotion", "promotion is already decided", promotion_id=promotion_id)
        return
    gates: dict[str, bool] = dict(promotion.data.get("gates", {}))
    failing = sorted(gate for gate, ok in gates.items() if not ok)
    outcome = "accepted" if gates and not failing else "rejected"
    graph.patch_object(promotion.id, {"state": outcome})
    candidate = _find(ctx, "candidate", "candidate_id", promotion.data.get("candidate_id", ""))
    if candidate is not None:
        graph.add_relation(promotion.id, candidate.id, "promoted_from")
    graph.emit(
        "gauntlet.promotion.decided",
        {
            "promotion_id": promotion_id,
            "outcome": outcome,
            "failing_gates": failing,
            "gates": gates,
        },
    )


_LEDGER_PROJECTIONS: Final[dict[str, str]] = {
    "gauntlet.spec.frozen_validated": "dev.gauntlet.spec.frozen.v1",
    "gauntlet.counterexample.recorded": "dev.gauntlet.counterexample.created.v1",
    "gauntlet.experiment.completed": "dev.gauntlet.experiment.completed.v1",
}


@_behavior(
    "gauntlet.ledger_projection",
    on=[
        "gauntlet.spec.frozen_validated",
        "gauntlet.intent.decided",
        "gauntlet.effect.settled",
        "gauntlet.belief.impacted",
        "gauntlet.counterexample.recorded",
        "gauntlet.experiment.completed",
        "gauntlet.promotion.decided",
    ],
)
def ledger_projection(event: Any, graph: Any, ctx: Any) -> None:
    """Portable ledger projection: map durable outcomes onto CloudEvents types.

    The ledger writer consumes ``gauntlet.ledger.project`` events and appends
    the Git-portable records; internal truth stays in ActiveGraph.
    """
    cloudevent_type = _LEDGER_PROJECTIONS.get(event.type)
    if cloudevent_type is None:
        if event.type == "gauntlet.intent.decided":
            suffix = "committed" if event.payload.get("outcome") == "committed" else "aborted"
            cloudevent_type = f"dev.gauntlet.intent.{suffix}.v1"
        elif event.type == "gauntlet.effect.settled":
            outcome_map = {
                IntentState.COMPLETED.value: "completed",
                IntentState.FAILED_BEFORE_EFFECT.value: "failed",
                IntentState.FAILED_AFTER_EFFECT.value: "failed",
                IntentState.OUTCOME_UNKNOWN.value: "unknown",
                IntentState.COMPENSATED.value: "compensated",
            }
            suffix = outcome_map.get(event.payload.get("outcome", ""), "unknown")
            cloudevent_type = f"dev.gauntlet.effect.{suffix}.v1"
        elif event.type == "gauntlet.belief.impacted":
            if event.payload.get("to_state") != BeliefState.REVOKED.value:
                return
            cloudevent_type = "dev.gauntlet.belief.revoked.v1"
        elif event.type == "gauntlet.promotion.decided":
            suffix = "accepted" if event.payload.get("outcome") == "accepted" else "rejected"
            cloudevent_type = f"dev.gauntlet.promotion.{suffix}.v1"
        else:  # pragma: no cover - closed by the `on` list above
            return
    graph.emit(
        "gauntlet.ledger.project",
        {"cloudevent_type": cloudevent_type, "source_event": event.id, "data": event.payload},
    )


@_behavior("gauntlet.counterexample_recorder", on=["gauntlet.counterexample.recorded"])
def counterexample_recorder(event: Any, graph: Any, ctx: Any) -> None:
    payload = event.payload
    counterexample_id = payload.get("counterexample_id")
    if not counterexample_id:
        _reject(graph, "counterexample", "counterexample_id is required")
        return
    graph.add_object(
        "counterexample",
        {
            "counterexample_id": counterexample_id,
            "candidate_id": payload.get("candidate_id", "unknown"),
            "scope": payload.get("scope", "unknown"),
            "violated_rule": payload.get("violated_rule", "unknown"),
            "severity": payload.get("severity", "minor"),
            "status": "open",
        },
    )


@_behavior("gauntlet.handoff_inputs", on=["gauntlet.handoff.requested"])
def handoff_inputs(event: Any, graph: Any, ctx: Any) -> None:
    """Assemble deterministic handoff generation inputs from graph state."""
    payload = event.payload
    handoff_id = payload.get("handoff_id")
    campaign_id = payload.get("campaign_id")
    if not handoff_id or not campaign_id:
        _reject(graph, "handoff", "handoff_id and campaign_id are required")
        return
    unresolved = sorted(
        o.data["counterexample_id"]
        for o in ctx.view.objects("counterexample")
        if o.data.get("status") == "open"
    )
    pending = sorted(
        o.data["intent_id"]
        for o in ctx.view.objects("intent")
        if o.data.get("state") in (IntentState.PROPOSED.value, IntentState.VOTING.value)
        and o.data.get("authority_decision") != AUTHORITY_AUTO_APPROVE
    )
    open_issues = sorted(
        o.data["issue_id"] for o in ctx.view.objects("issue") if o.data.get("status") == "open"
    )
    graph.add_object(
        "handoff",
        {
            "handoff_id": handoff_id,
            "campaign_id": campaign_id,
            "unresolved_counterexamples": unresolved,
            "pending_approvals": pending,
            "open_issues": open_issues,
        },
    )
    graph.emit(
        "gauntlet.handoff.prepared",
        {
            "handoff_id": handoff_id,
            "campaign_id": campaign_id,
            "unresolved_counterexamples": unresolved,
            "pending_approvals": pending,
            "open_issues": open_issues,
        },
    )


@_behavior("gauntlet.campaign_recorder", on=["gauntlet.campaign.created"])
def campaign_recorder(event: Any, graph: Any, ctx: Any) -> None:
    payload = event.payload
    campaign_id = payload.get("campaign_id")
    objective = payload.get("objective")
    spec_digest = payload.get("spec_digest")
    if not campaign_id or not objective or not spec_digest:
        _reject(graph, "campaign", "campaign_id, objective, and spec_digest are required")
        return
    if _find(ctx, "campaign", "campaign_id", campaign_id) is not None:
        _reject(graph, "campaign", "campaign already exists", campaign_id=campaign_id)
        return
    budget = payload.get("budget", {})
    graph.add_object(
        "campaign",
        {
            "campaign_id": campaign_id,
            "objective": objective,
            "spec_digest": spec_digest,
            "state": CampaignState.DRAFT.value,
            "stop_reason": None,
            "max_experiments": budget.get("max_experiments"),
            "max_wall_clock_seconds": budget.get("max_wall_clock_seconds"),
            "max_evaluator_runs": budget.get("max_evaluator_runs"),
            "max_cost_usd": budget.get("max_cost_usd"),
            "plateau_window": payload.get("plateau_window"),
        },
    )


@_behavior("gauntlet.campaign_transition", on=["gauntlet.campaign.transition"])
def campaign_transition(event: Any, graph: Any, ctx: Any) -> None:
    payload = event.payload
    campaign_id = payload.get("campaign_id")
    campaign = _find(ctx, "campaign", "campaign_id", campaign_id) if campaign_id else None
    if campaign is None:
        _reject(graph, "campaign", "unknown campaign", campaign_id=campaign_id)
        return
    try:
        target = CampaignState(payload.get("to_state"))
    except ValueError:
        _reject(
            graph,
            "campaign",
            f"invalid target state {payload.get('to_state')!r}",
            campaign_id=campaign_id,
        )
        return
    current = CampaignState(campaign.data["state"])
    if target not in CAMPAIGN_TRANSITIONS[current]:
        _reject(
            graph,
            "campaign",
            f"illegal transition {current.value} -> {target.value}",
            campaign_id=campaign_id,
        )
        return
    updates: dict[str, Any] = {"state": target.value}
    if target is CampaignState.STOPPED:
        reason_raw = payload.get("stop_reason", StopReason.AUTHORIZED_STOP.value)
        try:
            updates["stop_reason"] = StopReason(reason_raw).value
        except ValueError:
            updates["stop_reason"] = StopReason.AUTHORIZED_STOP.value
    graph.patch_object(campaign.id, updates)


@_behavior("gauntlet.campaign_stop_check", on=["gauntlet.campaign.stop_check"])
def campaign_stop_check(event: Any, graph: Any, ctx: Any) -> None:
    """Campaign stop-condition evaluation over declared budget and usage."""
    payload = event.payload
    campaign_id = payload.get("campaign_id")
    campaign = _find(ctx, "campaign", "campaign_id", campaign_id) if campaign_id else None
    if campaign is None:
        _reject(graph, "campaign", "unknown campaign", campaign_id=campaign_id)
        return
    usage = payload.get("usage", {})
    reason: StopReason | None = None
    budget_pairs = (
        ("experiments", "max_experiments"),
        ("wall_clock_seconds", "max_wall_clock_seconds"),
        ("evaluator_runs", "max_evaluator_runs"),
        ("cost_usd", "max_cost_usd"),
    )
    for usage_key, limit_key in budget_pairs:
        limit = campaign.data.get(limit_key)
        if limit is not None and usage.get(usage_key, 0) >= limit:
            reason = StopReason.BUDGET_EXHAUSTED
            break
    if reason is None and payload.get("target_reached", False):
        reason = StopReason.TARGET_REACHED
    if reason is None:
        window = campaign.data.get("plateau_window")
        if window is not None and payload.get("consecutive_no_improvement", 0) >= window:
            reason = StopReason.PLATEAU
    if reason is None:
        graph.emit("gauntlet.campaign.check_passed", {"campaign_id": campaign_id})
        return
    current = CampaignState(campaign.data["state"])
    if CampaignState.STOPPED in CAMPAIGN_TRANSITIONS[current]:
        graph.patch_object(
            campaign.id,
            {"state": CampaignState.STOPPED.value, "stop_reason": reason.value},
        )
    graph.emit(
        "gauntlet.campaign.stop_triggered",
        {"campaign_id": campaign_id, "stop_reason": reason.value},
    )


PACK_BEHAVIORS: Final[tuple[Any, ...]] = (
    node_recorder,
    record_versions,
    spec_freeze,
    intent_authority,
    intent_quorum,
    intent_transition,
    effect_settlement,
    observation_indexing,
    belief_recorder,
    belief_transition,
    experiment_recorder,
    experiment_transition,
    artifact_guard,
    evaluation_guard,
    promotion_gate_check,
    promotion_gate_aggregation,
    ledger_projection,
    counterexample_recorder,
    handoff_inputs,
    campaign_recorder,
    campaign_transition,
    campaign_stop_check,
)


def build_pack() -> Any:
    """Entry point for the ``activegraph.packs`` group (see pyproject.toml)."""
    object_types = tuple(
        ag_packs.ObjectType(name=name, schema=schema, description=schema.__doc__ or "")
        for name, schema in _OBJECT_SCHEMAS.items()
    )
    relation_types = tuple(
        ag_packs.RelationType(name=name, source_types=sources, target_types=targets)
        for name, (sources, targets) in _RELATION_SPECS.items()
    )
    return ag_packs.Pack(
        name=PACK_NAME,
        version=PACK_VERSION,
        description="Gauntlet campaign state: evidence, authority, experiments, promotion.",
        object_types=object_types,
        relation_types=relation_types,
        behaviors=PACK_BEHAVIORS,
    )
