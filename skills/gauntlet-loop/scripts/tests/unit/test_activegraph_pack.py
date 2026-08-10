"""Unit tests for the Gauntlet ActiveGraph pack and its behaviors."""

from __future__ import annotations

from importlib.metadata import entry_points
from pathlib import Path
from typing import Any

from gauntlet import activegraph_adapter as adapter
from gauntlet.activegraph_pack import (
    OBJECT_TYPE_NAMES,
    RELATION_TYPE_NAMES,
    build_pack,
)
from gauntlet.canonical_json import digest_value

BRIEF_OBJECT_TYPES = {
    "project",
    "spec",
    "reference",
    "campaign",
    "artifact",
    "evaluator",
    "dataset",
    "observation",
    "belief",
    "issue",
    "counterexample",
    "diagnosis",
    "intervention",
    "intent",
    "vote",
    "effect",
    "experiment",
    "candidate",
    "decision",
    "promotion",
    "release",
    "bundle",
    "handoff",
}

BRIEF_RELATION_TYPES = {
    "derived_from",
    "produced_by",
    "observed_in",
    "supports",
    "contradicts",
    "depends_on",
    "blocks",
    "violates",
    "localizes",
    "minimizes",
    "explains",
    "falsifies",
    "tests",
    "repairs",
    "regresses",
    "evaluated_by",
    "supersedes",
    "revokes",
    "promoted_from",
    "released_as",
    "settles",
    "caused_by",
    "forked_from",
}


def _handle(tmp_path: Path, run_id: str = "campaign--unit") -> adapter.GraphHandle:
    return adapter.open_runtime(str(tmp_path / "ag.sqlite3"), run_id)


def _events(handle: adapter.GraphHandle, event_type: str) -> list[dict[str, Any]]:
    return [event.payload for event in handle.runtime.graph.events if event.type == event_type]


def _objects(handle: adapter.GraphHandle, node_type: str) -> list[dict[str, Any]]:
    return [obj.data for obj in handle.runtime.graph.all_objects() if obj.type == node_type]


def _freeze_spec(handle: adapter.GraphHandle, surfaces: list[str] | None = None) -> str:
    document = {"goal": "unit"}
    digest = digest_value(document)
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {
            "spec_id": "spec:unit",
            "document": document,
            "declared_digest": digest,
            "frozen_surfaces": surfaces or [],
        },
    )
    return digest


def _create_campaign(handle: adapter.GraphHandle, **budget: int) -> None:
    adapter.emit_event(
        handle,
        "gauntlet.campaign.created",
        {
            "campaign_id": "campaign:unit",
            "objective": "unit objective",
            "spec_digest": _freeze_spec(handle),
            "budget": budget,
        },
    )


def test_pack_registers_all_brief_types() -> None:
    pack = build_pack()
    object_names = {object_type.name for object_type in pack.object_types}
    relation_names = {relation_type.name for relation_type in pack.relation_types}
    assert object_names >= BRIEF_OBJECT_TYPES
    assert object_names == set(OBJECT_TYPE_NAMES)
    assert relation_names == BRIEF_RELATION_TYPES == set(RELATION_TYPE_NAMES)
    assert len(pack.behaviors) >= 12
    # Every relation type constrains both endpoints to registered types.
    for relation_type in pack.relation_types:
        assert relation_type.source_types, relation_type.name
        assert relation_type.target_types, relation_type.name
        assert set(relation_type.source_types) <= object_names
        assert set(relation_type.target_types) <= object_names


def test_pack_entry_point_resolves_to_build_pack() -> None:
    matches = [ep for ep in entry_points(group="activegraph.packs") if ep.name == "gauntlet"]
    assert len(matches) == 1
    loaded = matches[0].load()
    pack = loaded()
    assert pack.name == "gauntlet"
    assert {object_type.name for object_type in pack.object_types} >= BRIEF_OBJECT_TYPES


def test_pack_loads_into_runtime_and_enforces_schemas(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    assert any(event.type == "pack.loaded" for event in handle.runtime.graph.events)
    # Schema-violating node data becomes a durable rejection, not a node.
    adapter.emit_event(
        handle, "gauntlet.node.recorded", {"node_type": "nonsense", "data": {"x": 1}}
    )
    assert _events(handle, "gauntlet.node.rejected")
    # A schema violation inside the recorder behavior becomes behavior.failed
    # durable evidence (bad field for the declared project schema).
    adapter.emit_event(
        handle,
        "gauntlet.node.recorded",
        {"node_type": "project", "data": {"bogus_field": True}},
    )
    failures = _events(handle, "behavior.failed")
    assert any("PackSchemaViolation" in str(payload) for payload in failures)
    assert _objects(handle, "project") == []


def test_relation_constraint_violation_is_durable_evidence(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    adapter.record_node(handle, "project", {"project_id": "p1"})
    adapter.record_node(handle, "evaluator", {"evaluator_id": "evaluator:e1"})
    project_id = next(obj.id for obj in handle.runtime.graph.all_objects() if obj.type == "project")
    evaluator_id = next(
        obj.id for obj in handle.runtime.graph.all_objects() if obj.type == "evaluator"
    )
    # 'depends_on' only allows belief sources; project -> evaluator must fail.
    adapter.emit_event(
        handle,
        "gauntlet.node.recorded",
        {
            "node_type": "belief",
            "data": {"belief_id": "belief:b1", "statement": "s"},
            "relations": [{"source": project_id, "target": evaluator_id, "type": "depends_on"}],
        },
    )
    failures = _events(handle, "behavior.failed")
    assert any("depends_on" in str(payload) for payload in failures)
    assert handle.runtime.graph.all_relations() == []


def test_spec_freeze_digest_validation(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    document = {"goal": "unit"}
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {"spec_id": "spec:bad", "document": document, "declared_digest": digest_value({"x": 1})},
    )
    rejections = _events(handle, "gauntlet.spec.rejected")
    assert len(rejections) == 1 and "digest" in rejections[0]["reason"]
    assert _objects(handle, "spec") == []

    digest = _freeze_spec(handle)
    specs = _objects(handle, "spec")
    assert specs == [
        {"spec_id": "spec:unit", "digest": digest, "frozen": True, "frozen_surfaces": []}
    ]
    assert _events(handle, "gauntlet.spec.frozen_validated")
    # Re-freezing a frozen spec is rejected: immutable once frozen.
    _freeze_spec(handle)
    assert any("already frozen" in r["reason"] for r in _events(handle, "gauntlet.spec.rejected"))


def test_intent_authority_matrix(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    cases = {
        "intent:r1": ("R1", "auto_approve"),
        "intent:r2": ("R2", "require_approval"),
        "intent:r3": ("R3", "require_approval"),
        "intent:r4": ("R4", "require_governance"),
        "intent:bad": ("R9", "fail_closed"),
    }
    for intent_id, (action_class, _) in cases.items():
        adapter.emit_event(
            handle,
            "gauntlet.intent.proposed",
            {
                "intent_id": intent_id,
                "capability": "unit",
                "action_class": action_class,
                "effect_class": "reversible",
            },
        )
    evaluated = {
        payload["intent_id"]: payload["decision"]
        for payload in _events(handle, "gauntlet.intent.authority_evaluated")
    }
    assert evaluated == {intent_id: decision for intent_id, (_, decision) in cases.items()}
    # Missing action class also fails closed.
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {"intent_id": "intent:none", "capability": "unit", "effect_class": "unknown"},
    )
    assert evaluated | {"intent:none": "fail_closed"} == {
        payload["intent_id"]: payload["decision"]
        for payload in _events(handle, "gauntlet.intent.authority_evaluated")
    }


def _vote(
    handle: adapter.GraphHandle,
    intent_id: str,
    vote_id: str,
    voter_kind: str,
    decision: str,
    scope: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "intent_id": intent_id,
        "vote_id": vote_id,
        "voter_kind": voter_kind,
        "decision": decision,
        "reason": "unit",
    }
    if scope is not None:
        payload["scope"] = scope
    adapter.emit_event(handle, "gauntlet.intent.vote_cast", payload)


def _intent_state(handle: adapter.GraphHandle, intent_id: str) -> str:
    return next(
        str(data["state"]) for data in _objects(handle, "intent") if data["intent_id"] == intent_id
    )


def test_intent_quorum_decision_transitions(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    for intent_id, action_class in (
        ("intent:auto", "R1"),
        ("intent:outward", "R3"),
        ("intent:gov", "R4"),
        ("intent:bad", "nope"),
        ("intent:veto", "R1"),
    ):
        adapter.emit_event(
            handle,
            "gauntlet.intent.proposed",
            {
                "intent_id": intent_id,
                "capability": "unit",
                "action_class": action_class,
                "effect_class": "reversible",
            },
        )

    # auto_approve commits on the mandatory deterministic policy approve.
    _vote(handle, "intent:auto", "vote:a1", "deterministic-policy", "approve")
    assert _intent_state(handle, "intent:auto") == "committed"

    # R3: policy approve alone is not quorum; an LLM approve never counts;
    # a human approve completes it.
    _vote(handle, "intent:outward", "vote:o1", "deterministic-policy", "approve")
    assert _intent_state(handle, "intent:outward") == "voting"
    _vote(handle, "intent:outward", "vote:o2", "llm-semantic", "approve")
    assert _intent_state(handle, "intent:outward") == "voting"
    _vote(handle, "intent:outward", "vote:o3", "human-approval", "approve")
    assert _intent_state(handle, "intent:outward") == "committed"

    # R4 needs a governance-scoped human approve, not a plain one.
    _vote(handle, "intent:gov", "vote:g1", "deterministic-policy", "approve")
    _vote(handle, "intent:gov", "vote:g2", "human-approval", "approve")
    assert _intent_state(handle, "intent:gov") == "voting"
    _vote(handle, "intent:gov", "vote:g3", "human-approval", "approve", scope="governance")
    assert _intent_state(handle, "intent:gov") == "committed"

    # Fail-closed intent never commits regardless of votes.
    _vote(handle, "intent:bad", "vote:b1", "deterministic-policy", "approve")
    _vote(handle, "intent:bad", "vote:b2", "human-approval", "approve", scope="governance")
    assert _intent_state(handle, "intent:bad") == "voting"
    assert _events(handle, "gauntlet.vote.rejected")

    # Any reject (here an LLM veto) aborts.
    _vote(handle, "intent:veto", "vote:v1", "llm-semantic", "reject")
    assert _intent_state(handle, "intent:veto") == "aborted"


def test_effect_result_state_transition(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {
            "intent_id": "intent:e",
            "capability": "unit",
            "action_class": "R1",
            "effect_class": "reversible",
        },
    )
    # Not committed yet: an effect result must be rejected (no effect before commit).
    adapter.emit_event(
        handle,
        "gauntlet.effect.result",
        {"intent_id": "intent:e", "effect_id": "effect:early", "outcome": "completed"},
    )
    assert _events(handle, "gauntlet.effect.rejected")
    assert _objects(handle, "effect") == []

    _vote(handle, "intent:e", "vote:e1", "deterministic-policy", "approve")
    adapter.emit_event(
        handle, "gauntlet.intent.transition", {"intent_id": "intent:e", "to_state": "executing"}
    )
    adapter.emit_event(
        handle,
        "gauntlet.effect.result",
        {"intent_id": "intent:e", "effect_id": "effect:ok", "outcome": "outcome_unknown"},
    )
    assert _intent_state(handle, "intent:e") == "outcome_unknown"
    settled = _events(handle, "gauntlet.effect.settled")
    assert settled == [
        {"intent_id": "intent:e", "effect_id": "effect:ok", "outcome": "outcome_unknown"}
    ]
    relations = handle.runtime.graph.all_relations()
    assert any(rel.type == "settles" for rel in relations)


def test_observation_to_issue_indexing(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    for index in range(2):
        adapter.emit_event(
            handle,
            "gauntlet.observation.recorded",
            {
                "observation_id": f"observation:{index}",
                "scope": "render/frame-1",
                "raw_digest": digest_value({"i": index}),
                "violated_rule": "no-clipping",
            },
        )
    adapter.emit_event(
        handle,
        "gauntlet.observation.recorded",
        {
            "observation_id": "observation:other",
            "scope": "render/frame-1",
            "raw_digest": digest_value({"i": 9}),
            "violated_rule": "different-rule",
        },
    )
    issues = _objects(handle, "issue")
    assert len(issues) == 2
    clipping = next(issue for issue in issues if len(issue["observation_ids"]) == 2)
    assert clipping["observation_ids"] == ["observation:0", "observation:1"]
    assert len(_events(handle, "gauntlet.issue.indexed")) == 3


def test_belief_dependency_and_revocation_impact(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    adapter.emit_event(
        handle,
        "gauntlet.observation.recorded",
        {"observation_id": "observation:base", "scope": "s", "raw_digest": digest_value({})},
    )
    adapter.emit_event(
        handle,
        "gauntlet.belief.recorded",
        {
            "belief_id": "belief:root",
            "statement": "root belief",
            "depends_on_observations": ["observation:base"],
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.belief.recorded",
        {
            "belief_id": "belief:child",
            "statement": "depends on root",
            "depends_on_beliefs": ["belief:root"],
        },
    )
    assert len(handle.runtime.graph.relations(type="depends_on")) == 2
    # Illegal transition is rejected without mutation.
    adapter.emit_event(
        handle,
        "gauntlet.belief.transition",
        {"belief_id": "belief:root", "to_state": "action_safe"},
    )
    assert any(
        "illegal transition" in payload["reason"]
        for payload in _events(handle, "gauntlet.belief.rejected")
    )
    # Revocation quarantines dependents and records the impact.
    adapter.emit_event(
        handle, "gauntlet.belief.transition", {"belief_id": "belief:root", "to_state": "revoked"}
    )
    states = {data["belief_id"]: str(data["state"]) for data in _objects(handle, "belief")}
    assert states == {"belief:root": "revoked", "belief:child": "quarantined"}
    impacted = _events(handle, "gauntlet.belief.impacted")
    assert impacted[0]["impacted_belief_ids"] == ["belief:child"]
    # Revocation projects into the portable ledger.
    projections = _events(handle, "gauntlet.ledger.project")
    assert any(
        payload["cloudevent_type"] == "dev.gauntlet.belief.revoked.v1" for payload in projections
    )


def test_experiment_state_machine(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _create_campaign(handle, max_experiments=5)
    adapter.emit_event(
        handle,
        "gauntlet.experiment.recorded",
        {"experiment_id": "experiment:x", "campaign_id": "campaign:unit"},
    )
    adapter.emit_event(
        handle,
        "gauntlet.experiment.transition",
        {"experiment_id": "experiment:x", "to_status": "keep"},
    )
    assert any(
        "illegal transition" in payload["reason"]
        for payload in _events(handle, "gauntlet.experiment.rejected")
    )
    for status in ("running", "keep"):
        adapter.emit_event(
            handle,
            "gauntlet.experiment.transition",
            {"experiment_id": "experiment:x", "to_status": status},
        )
    assert str(_objects(handle, "experiment")[0]["status"]) == "keep"
    completed = _events(handle, "gauntlet.experiment.completed")
    assert completed == [{"experiment_id": "experiment:x", "status": "keep"}]
    projections = _events(handle, "gauntlet.ledger.project")
    assert any(
        payload["cloudevent_type"] == "dev.gauntlet.experiment.completed.v1"
        for payload in projections
    )


def test_frozen_surface_and_evaluator_leakage_flagging(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _freeze_spec(handle, surfaces=[".gauntlet/evaluators/**"])
    adapter.emit_event(
        handle,
        "gauntlet.artifact.recorded",
        {
            "artifact_id": "artifact:ok",
            "role": "derived",
            "digest": digest_value({"a": 1}),
            "path": "src/main.py",
            "candidate_produced": True,
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.artifact.recorded",
        {
            "artifact_id": "artifact:bad",
            "role": "derived",
            "digest": digest_value({"a": 2}),
            "path": ".gauntlet/evaluators/judge.py",
            "candidate_produced": True,
        },
    )
    violations = _events(handle, "gauntlet.violation.frozen_surface")
    assert violations == [
        {
            "artifact_id": "artifact:bad",
            "path": ".gauntlet/evaluators/judge.py",
            "surface": ".gauntlet/evaluators/**",
            "spec_id": "spec:unit",
        }
    ]
    adapter.record_node(
        handle, "evaluator", {"evaluator_id": "evaluator:loose", "frozen_for_promotion": False}
    )
    adapter.record_node(
        handle, "evaluator", {"evaluator_id": "evaluator:frozen", "frozen_for_promotion": True}
    )
    for evaluator, split in (
        ("evaluator:loose", "search"),
        ("evaluator:loose", "promotion"),
        ("evaluator:frozen", "promotion"),
    ):
        adapter.emit_event(
            handle,
            "gauntlet.evaluation.recorded",
            {
                "evaluation_id": f"evaluation:{evaluator}-{split}",
                "evaluator_id": evaluator,
                "split": split,
            },
        )
    leakage = _events(handle, "gauntlet.violation.evaluator_leakage")
    assert [payload["evaluation_id"] for payload in leakage] == [
        "evaluation:evaluator:loose-promotion"
    ]


def test_promotion_gate_aggregation(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    # No recorded gates: fail closed.
    adapter.emit_event(handle, "gauntlet.promotion.requested", {"promotion_id": "promotion:none"})
    assert any(
        "failing closed" in payload["reason"]
        for payload in _events(handle, "gauntlet.promotion.rejected")
    )
    for promotion_id, gate, passed in (
        ("promotion:good", "invariants", True),
        ("promotion:good", "protected-regressions", True),
        ("promotion:bad", "invariants", True),
        ("promotion:bad", "protected-regressions", False),
    ):
        adapter.emit_event(
            handle,
            "gauntlet.promotion.gate_checked",
            {
                "promotion_id": promotion_id,
                "campaign_id": "campaign:unit",
                "candidate_id": "candidate:c",
                "gate": gate,
                "passed": passed,
                "detail": "unit",
            },
        )
    for promotion_id in ("promotion:good", "promotion:bad"):
        adapter.emit_event(handle, "gauntlet.promotion.requested", {"promotion_id": promotion_id})
    decided = _events(handle, "gauntlet.promotion.decided")
    decisions = {payload["promotion_id"]: payload for payload in decided}
    assert decisions["promotion:good"]["outcome"] == "accepted"
    assert decisions["promotion:good"]["failing_gates"] == []
    assert decisions["promotion:bad"]["outcome"] == "rejected"
    assert decisions["promotion:bad"]["failing_gates"] == ["protected-regressions"]
    projections = [
        payload["cloudevent_type"] for payload in _events(handle, "gauntlet.ledger.project")
    ]
    assert "dev.gauntlet.promotion.accepted.v1" in projections
    assert "dev.gauntlet.promotion.rejected.v1" in projections
    # A decided promotion refuses further gates or re-aggregation.
    adapter.emit_event(
        handle,
        "gauntlet.promotion.gate_checked",
        {"promotion_id": "promotion:good", "gate": "late", "passed": False},
    )
    assert any(
        "already decided" in payload["reason"]
        for payload in _events(handle, "gauntlet.promotion.rejected")
    )


def test_handoff_generation_inputs(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _create_campaign(handle, max_experiments=5)
    adapter.emit_event(
        handle,
        "gauntlet.counterexample.recorded",
        {
            "counterexample_id": "counterexample:open",
            "candidate_id": "candidate:c",
            "scope": "s",
            "violated_rule": "r",
            "severity": "major",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {
            "intent_id": "intent:pending",
            "capability": "push",
            "action_class": "R3",
            "effect_class": "irreversible_gated",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.handoff.requested",
        {"handoff_id": "handoff:1", "campaign_id": "campaign:unit"},
    )
    prepared = _events(handle, "gauntlet.handoff.prepared")
    assert prepared == [
        {
            "handoff_id": "handoff:1",
            "campaign_id": "campaign:unit",
            "unresolved_counterexamples": ["counterexample:open"],
            "pending_approvals": ["intent:pending"],
            "open_issues": [],
        }
    ]
    assert len(_objects(handle, "handoff")) == 1


def test_campaign_stop_condition_evaluation(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _create_campaign(handle, max_experiments=2)
    adapter.emit_event(
        handle,
        "gauntlet.campaign.transition",
        {"campaign_id": "campaign:unit", "to_state": "active"},
    )
    adapter.emit_event(
        handle,
        "gauntlet.campaign.stop_check",
        {"campaign_id": "campaign:unit", "usage": {"experiments": 1}},
    )
    assert _events(handle, "gauntlet.campaign.check_passed")
    assert str(_objects(handle, "campaign")[0]["state"]) == "active"
    adapter.emit_event(
        handle,
        "gauntlet.campaign.stop_check",
        {"campaign_id": "campaign:unit", "usage": {"experiments": 2}},
    )
    stopped = _events(handle, "gauntlet.campaign.stop_triggered")
    assert stopped == [{"campaign_id": "campaign:unit", "stop_reason": "budget-exhausted"}]
    campaign = _objects(handle, "campaign")[0]
    assert str(campaign["state"]) == "stopped"
    assert str(campaign["stop_reason"]) == "budget-exhausted"
    # Illegal transition out of stopped is rejected.
    adapter.emit_event(
        handle,
        "gauntlet.campaign.transition",
        {"campaign_id": "campaign:unit", "to_state": "active"},
    )
    assert any(
        "illegal transition" in payload["reason"]
        for payload in _events(handle, "gauntlet.campaign.rejected")
    )
