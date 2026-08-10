"""Gauntlet <-> ActiveGraph conformance suite.

Records a small campaign, rebuilds it, forks before an intervention event,
produces a changed suffix, diffs it, rejects a conflicting promotion, and
promotes a nonconflicting candidate. The shape assertions at the top fail
loudly if the upstream ActiveGraph contract this skill relies on drifts.
"""

from __future__ import annotations

from pathlib import Path

import activegraph
import pytest

from gauntlet import activegraph_adapter as adapter
from gauntlet.canonical_json import digest_value
from gauntlet.errors import ConflictError, GateFailedError, InvalidInvocationError
from gauntlet.replay import ReplayService
from gauntlet.support import FrozenClock, SequentialIdGenerator

RUN_ID = "campaign--conformance"


def _store(tmp_path: Path) -> str:
    return str(tmp_path / "activegraph.sqlite3")


def _record_small_campaign(handle: adapter.GraphHandle) -> None:
    """Spec, campaign, committed+settled intent, observation, experiment."""
    document = {"goal": "conformance", "invariants": ["deterministic"]}
    digest = digest_value(document)
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {
            "spec_id": "spec:conformance",
            "document": document,
            "declared_digest": digest,
            "frozen_surfaces": [".gauntlet/policies/**"],
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.campaign.created",
        {
            "campaign_id": "campaign:conformance",
            "objective": "prove the runtime boundary",
            "spec_digest": digest,
            "budget": {"max_experiments": 5},
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.intent.proposed",
        {
            "intent_id": "intent:001",
            "capability": "write-gauntlet-state",
            "action_class": "R1",
            "effect_class": "reversible",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.intent.vote_cast",
        {
            "intent_id": "intent:001",
            "vote_id": "vote:001",
            "voter_kind": "deterministic-policy",
            "decision": "approve",
            "reason": "within ceiling",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.intent.transition",
        {"intent_id": "intent:001", "to_state": "executing"},
    )
    adapter.emit_event(
        handle,
        "gauntlet.effect.result",
        {"intent_id": "intent:001", "effect_id": "effect:001", "outcome": "completed"},
    )
    adapter.emit_event(
        handle,
        "gauntlet.observation.recorded",
        {
            "observation_id": "observation:001",
            "scope": "render/frame-12",
            "raw_digest": digest_value({"pixels": "raw"}),
            "violated_rule": "no-clipping",
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.experiment.recorded",
        {"experiment_id": "experiment:001", "campaign_id": "campaign:conformance"},
    )


def test_upstream_contract_shapes(tmp_path: Path) -> None:
    """Fail loudly when the pinned ActiveGraph surface drifts."""
    assert activegraph.__version__.startswith("1.10."), (
        "activegraph minor version drifted; re-verify the adapter spike facts"
    )
    for attr in ("fork", "diff", "promote", "load_pack", "run_until_idle", "status"):
        assert callable(getattr(activegraph.Runtime, attr))
    handle = adapter.open_runtime(_store(tmp_path), RUN_ID)
    graph = handle.runtime.graph
    for attr in ("emit", "ids", "clock", "all_objects", "all_relations", "events"):
        assert hasattr(graph, attr)
    event_id = adapter.emit_event(
        handle,
        "gauntlet.node.recorded",
        {
            "node_type": "project",
            "data": {"project_id": "proj-conformance"},
        },
    )
    assert event_id.startswith("evt_")
    runs = activegraph.SQLiteEventStore.list_runs(_store(tmp_path))
    record = runs[0]
    for attr in ("run_id", "parent_run_id", "forked_at_event_id", "label", "created_at"):
        assert hasattr(record, attr)
    assert issubclass(activegraph.ReplayDivergenceError, Exception)
    assert issubclass(activegraph.PromoteConflictError, Exception)


def test_record_rebuild_fork_diff_and_promotion(tmp_path: Path) -> None:
    store = _store(tmp_path)
    parent = adapter.open_runtime(store, RUN_ID)
    _record_small_campaign(parent)

    # --- rebuild reconstructs exact state, deterministically -------------
    service = ReplayService(store, clock=FrozenClock(), ids=SequentialIdGenerator())
    first = service.rebuild(RUN_ID)
    second = service.rebuild(RUN_ID)
    assert first.state_digest == second.state_digest
    assert first.events_digest == second.events_digest
    assert first.object_count == len(parent.runtime.graph.all_objects())

    # --- fork before the intervention event ------------------------------
    fork_point = parent.runtime.graph.events[-1].id
    adapter.emit_event(
        parent,
        "gauntlet.node.recorded",
        {
            "node_type": "intervention",
            "data": {
                "intervention_id": "intervention:parent",
                "diagnosis_id": "diagnosis:001",
                "primary_seam": "specification",
                "expected_mechanism": "tighten the invariant",
                "rollback_plan": "revert the spec patch",
            },
        },
    )
    fork = adapter.fork_at(parent, fork_point, label="candidate-a")
    assert fork.run_id != parent.run_id
    fork_runs = {run.run_id: run for run in adapter.list_runs(store)}
    assert fork_runs[fork.run_id].parent_run_id == RUN_ID
    assert fork_runs[fork.run_id].forked_at_event_id == fork_point

    # --- changed suffix on the fork --------------------------------------
    adapter.emit_event(
        fork,
        "gauntlet.node.recorded",
        {
            "node_type": "intervention",
            "data": {
                "intervention_id": "intervention:fork",
                "diagnosis_id": "diagnosis:001",
                "primary_seam": "deterministic-operator",
                "expected_mechanism": "swap the operator",
                "rollback_plan": "drop the candidate branch",
            },
        },
    )

    # --- structural diff identifies the divergence -----------------------
    diff = adapter.structural_diff(parent, fork)
    assert not diff.is_identical
    assert diff.parent_run_id == RUN_ID
    assert diff.fork_run_id == fork.run_id
    assert "gauntlet.node.recorded" in diff.fork_only_event_types
    assert "gauntlet.node.recorded" in diff.parent_only_event_types
    assert diff.shared_event_count > 0
    assert diff.divergent_object_ids  # both sides created intervention nodes

    # --- conflicting promotion is rejected fail-closed -------------------
    # Parent and fork patch the same experiment object after the fork point.
    adapter.emit_event(
        parent,
        "gauntlet.experiment.transition",
        {"experiment_id": "experiment:001", "to_status": "running"},
    )
    adapter.emit_event(
        fork,
        "gauntlet.experiment.transition",
        {"experiment_id": "experiment:001", "to_status": "blocked"},
    )
    plan = adapter.promote_dry_run(parent, fork)
    assert not plan.is_promotable
    assert any("both_changed" in conflict for conflict in plan.conflicts)
    with pytest.raises(ConflictError) as conflict_info:
        adapter.promote(parent, fork)
    assert "conflict" in str(conflict_info.value).lower()

    # --- nonconflicting candidate promotes successfully ------------------
    clean_fork_point = parent.runtime.graph.events[-1].id
    clean_fork = adapter.fork_at(parent, clean_fork_point, label="candidate-b")
    adapter.emit_event(
        clean_fork,
        "gauntlet.belief.recorded",
        {"belief_id": "belief:fork-only", "statement": "the candidate helps"},
    )
    dry = adapter.promote_dry_run(parent, clean_fork)
    assert dry.is_promotable and not dry.is_empty
    applied = adapter.promote(parent, clean_fork)
    assert applied.marker_event_id
    assert applied.applied_event_ids
    promoted = [
        obj
        for obj in parent.runtime.graph.all_objects()
        if obj.type == "belief" and obj.data.get("belief_id") == "belief:fork-only"
    ]
    assert len(promoted) == 1, "promotion must apply the fork-only belief to the parent"
    # The parent's own post-fork change survived (state delta, no history copy).
    experiments = [obj for obj in parent.runtime.graph.all_objects() if obj.type == "experiment"]
    assert experiments[0].data.get("status") == "running"


def test_strict_replay_detects_divergence(tmp_path: Path) -> None:
    store = _store(tmp_path)
    handle = adapter.open_runtime(store, RUN_ID)
    _record_small_campaign(handle)
    service = ReplayService(store, clock=FrozenClock(), ids=SequentialIdGenerator())
    verified = service.strict(RUN_ID)
    assert verified.strict_verified

    # Recording made with an extra behavior no longer registered at replay
    # time must diverge: the recorded derived events cannot be re-derived.
    def extra_fn(event: object, graph: object, ctx: object) -> None:
        graph.add_object("project", {"project_id": "from-extra-behavior"})  # type: ignore[attr-defined]

    extra = activegraph.behavior(name="gauntlet.test.extra", on=["gauntlet.test.ping"])(extra_fn)

    divergent_run = "campaign--divergent"
    recording = adapter.open_runtime(store, divergent_run, extra_behaviors=(extra,))
    adapter.emit_event(recording, "gauntlet.test.ping", {})
    with pytest.raises(GateFailedError):
        service.strict(divergent_run)


def test_read_only_helpers_and_backup(tmp_path: Path) -> None:
    store = _store(tmp_path)
    handle = adapter.open_runtime(store, RUN_ID)
    _record_small_campaign(handle)
    adapter.record_runtime_versions(handle)

    health = adapter.health_check(store)
    assert health.exists and health.run_count == 1
    assert health.total_events == len(handle.runtime.graph.events)
    assert health.activegraph_version.startswith("1.10.")

    versions = [obj for obj in handle.runtime.graph.all_objects() if obj.type == "runtime_versions"]
    assert len(versions) == 1
    assert versions[0].data["activegraph_version"] == health.activegraph_version

    export = tmp_path / "exports" / "run.jsonl"
    count = adapter.export_events_jsonl(store, RUN_ID, export)
    assert count == health.total_events
    lines = export.read_text(encoding="utf-8").splitlines()
    assert len(lines) == count

    backup = adapter.backup_store(store, tmp_path / "backups" / "copy.sqlite3")
    assert backup.exists()
    assert adapter.health_check(backup).total_events == health.total_events

    with pytest.raises(InvalidInvocationError):
        adapter.read_events(str(tmp_path / "missing.sqlite3"), RUN_ID)
    with pytest.raises(InvalidInvocationError):
        adapter.open_existing(store, "never-created")
