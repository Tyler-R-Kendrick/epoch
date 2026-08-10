"""Determinism and next-transition tests for the graph projections."""

from __future__ import annotations

from pathlib import Path

from gauntlet import activegraph_adapter as adapter
from gauntlet import graph_projection as projection
from gauntlet.canonical_json import digest_value

CAMPAIGN = "campaign:proj"


def _handle(tmp_path: Path) -> adapter.GraphHandle:
    return adapter.open_runtime(str(tmp_path / "ag.sqlite3"), "campaign--proj")


def _freeze_and_create(handle: adapter.GraphHandle) -> None:
    document = {"goal": "projection"}
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {
            "spec_id": "spec:proj",
            "document": document,
            "declared_digest": digest_value(document),
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.campaign.created",
        {
            "campaign_id": CAMPAIGN,
            "objective": "project deterministically",
            "spec_digest": digest_value(document),
            "budget": {"max_experiments": 3},
        },
    )


def test_next_transitions_walk_the_campaign_lifecycle(tmp_path: Path) -> None:
    handle = _handle(tmp_path)

    empty = projection.next_transitions(adapter.snapshot(handle))
    assert [action.command for action in empty] == ["gauntlet spec freeze"]

    document = {"goal": "projection"}
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {
            "spec_id": "spec:proj",
            "document": document,
            "declared_digest": digest_value(document),
        },
    )
    frozen_only = projection.next_transitions(adapter.snapshot(handle))
    assert [action.command for action in frozen_only] == ["gauntlet campaign create"]

    adapter.emit_event(
        handle,
        "gauntlet.campaign.created",
        {
            "campaign_id": CAMPAIGN,
            "objective": "project deterministically",
            "spec_digest": digest_value(document),
            "budget": {},
        },
    )
    draft = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert [action.command for action in draft] == [
        "gauntlet campaign activate",
        "gauntlet campaign stop",
    ]

    adapter.emit_event(
        handle, "gauntlet.campaign.transition", {"campaign_id": CAMPAIGN, "to_state": "active"}
    )
    idle = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert [action.command for action in idle] == [
        "gauntlet observe",
        "gauntlet campaign stop",
    ]

    adapter.emit_event(
        handle,
        "gauntlet.counterexample.recorded",
        {
            "counterexample_id": "counterexample:1",
            "candidate_id": "candidate:1",
            "scope": "s",
            "violated_rule": "r",
            "severity": "major",
        },
    )
    with_counterexample = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert [action.command for action in with_counterexample] == [
        "gauntlet experiment propose",
        "gauntlet campaign stop",
    ]

    adapter.emit_event(
        handle,
        "gauntlet.experiment.recorded",
        {"experiment_id": "experiment:1", "campaign_id": CAMPAIGN},
    )
    adapter.emit_event(
        handle,
        "gauntlet.experiment.transition",
        {"experiment_id": "experiment:1", "to_status": "running"},
    )
    running = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert [action.command for action in running] == [
        "gauntlet experiment evaluate experiment:1",
        "gauntlet campaign stop",
    ]

    adapter.emit_event(
        handle,
        "gauntlet.experiment.transition",
        {"experiment_id": "experiment:1", "to_status": "keep"},
    )
    kept = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert "gauntlet promotion request" in [action.command for action in kept]

    adapter.emit_event(
        handle,
        "gauntlet.promotion.gate_checked",
        {
            "promotion_id": "promotion:1",
            "campaign_id": CAMPAIGN,
            "candidate_id": "candidate:1",
            "gate": "invariants",
            "passed": True,
        },
    )
    pending_promotion = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert "gauntlet promotion decide promotion:1" in [
        action.command for action in pending_promotion
    ]
    assert "gauntlet promotion request" not in [action.command for action in pending_promotion]

    adapter.emit_event(
        handle,
        "gauntlet.campaign.transition",
        {"campaign_id": CAMPAIGN, "to_state": "stopped", "stop_reason": "authorized-stop"},
    )
    stopped = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert [action.command for action in stopped] == ["gauntlet handoff generate"]


def test_pending_approvals_and_unresolved_counterexamples(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _freeze_and_create(handle)
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {
            "intent_id": "intent:auto",
            "capability": "write-gauntlet-state",
            "action_class": "R1",
            "effect_class": "reversible",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {
            "intent_id": "intent:push",
            "capability": "push",
            "action_class": "R3",
            "effect_class": "irreversible_gated",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.counterexample.recorded",
        {
            "counterexample_id": "counterexample:open",
            "candidate_id": "candidate:1",
            "scope": "s",
            "violated_rule": "r",
            "severity": "critical",
        },
    )
    snap = adapter.snapshot(handle)
    pending = projection.pending_approvals(snap)
    assert [view.intent_id for view in pending] == ["intent:push"]
    assert pending[0].authority_decision == "require_approval"
    assert pending[0].action_class == "R3"
    unresolved = projection.unresolved_counterexamples(snap)
    assert [view.counterexample_id for view in unresolved] == ["counterexample:open"]
    assert unresolved[0].severity == "critical"
    # An active campaign with a pending approval surfaces the approval action.
    adapter.emit_event(
        handle, "gauntlet.campaign.transition", {"campaign_id": CAMPAIGN, "to_state": "active"}
    )
    actions = projection.next_transitions(adapter.snapshot(handle), CAMPAIGN)
    assert "gauntlet intent approve intent:push" in [action.command for action in actions]


def test_campaign_status_read_model(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _freeze_and_create(handle)
    for index, status in enumerate(("running", "keep")):
        adapter.emit_event(
            handle,
            "gauntlet.experiment.recorded",
            {"experiment_id": f"experiment:{index}", "campaign_id": CAMPAIGN},
        )
        adapter.emit_event(
            handle,
            "gauntlet.experiment.transition",
            {"experiment_id": f"experiment:{index}", "to_status": "running"},
        )
        if status == "keep":
            adapter.emit_event(
                handle,
                "gauntlet.experiment.transition",
                {"experiment_id": f"experiment:{index}", "to_status": "keep"},
            )
    snap = adapter.snapshot(handle)
    status_view = projection.campaign_status(snap, CAMPAIGN)
    assert status_view is not None
    assert status_view.state == "draft"
    assert status_view.experiment_counts == (("keep", 1), ("running", 1))
    assert status_view.open_counterexample_count == 0
    assert projection.campaign_status(snap, "campaign:missing") is None


def test_projection_is_deterministic(tmp_path: Path) -> None:
    handle = _handle(tmp_path)
    _freeze_and_create(handle)
    adapter.emit_event(
        handle,
        "gauntlet.counterexample.recorded",
        {
            "counterexample_id": "counterexample:1",
            "candidate_id": "candidate:1",
            "scope": "s",
            "violated_rule": "r",
            "severity": "minor",
        },
    )
    snap_a = adapter.snapshot(handle)
    snap_b = adapter.snapshot(handle)
    assert projection.next_transitions(snap_a, CAMPAIGN) == projection.next_transitions(
        snap_b, CAMPAIGN
    )
    assert projection.campaign_status(snap_a, CAMPAIGN) == projection.campaign_status(
        snap_b, CAMPAIGN
    )
    assert projection.pending_approvals(snap_a) == projection.pending_approvals(snap_b)
    assert projection.unresolved_counterexamples(snap_a) == (
        projection.unresolved_counterexamples(snap_b)
    )
