"""Replay service tests: all four modes plus divergence detection."""

from __future__ import annotations

import json
from pathlib import Path

import activegraph
import pytest

from gauntlet import activegraph_adapter as adapter
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ReplayMode
from gauntlet.errors import GateFailedError, InvalidInvocationError
from gauntlet.ledger import LedgerStore
from gauntlet.replay import ReplayRecordV1, ReplayService
from gauntlet.support import FrozenClock, SequentialIdGenerator

RUN_ID = "campaign--replay"


def _record_run(store: str) -> adapter.GraphHandle:
    handle = adapter.open_runtime(store, RUN_ID)
    document = {"goal": "replay"}
    adapter.emit_event(
        handle,
        "gauntlet.spec.frozen",
        {
            "spec_id": "spec:replay",
            "document": document,
            "declared_digest": digest_value(document),
        },
    )
    adapter.emit_event(
        handle,
        "gauntlet.belief.recorded",
        {"belief_id": "belief:replay", "statement": "replay is deterministic"},
    )
    return handle


@pytest.fixture()
def service(tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator) -> ReplayService:
    return ReplayService(
        str(tmp_path / "ag.sqlite3"),
        clock=clock,
        ids=ids,
        ledger=LedgerStore(tmp_path / "ledger"),
    )


def test_rebuild_mode_pins_deterministic_digests(tmp_path: Path, service: ReplayService) -> None:
    store = str(tmp_path / "ag.sqlite3")
    handle = _record_run(store)
    record = service.run(ReplayMode.REBUILD, RUN_ID)
    again = service.run(ReplayMode.REBUILD, RUN_ID)
    assert record.mode is ReplayMode.REBUILD
    assert record.store_kind == "sqlite"
    assert record.state_digest == again.state_digest
    assert record.events_digest == again.events_digest
    assert record.object_count == len(handle.runtime.graph.all_objects())
    assert record.event_count == len(handle.runtime.graph.events)
    assert not record.strict_verified


def test_rebuild_appends_zero_events(tmp_path: Path, service: ReplayService) -> None:
    store = str(tmp_path / "ag.sqlite3")
    _record_run(store)
    before = len(adapter.read_events(store, RUN_ID))
    service.rebuild(RUN_ID)
    service.strict(RUN_ID)
    assert len(adapter.read_events(store, RUN_ID)) == before


def test_strict_mode_verifies_and_detects_divergence(
    tmp_path: Path, service: ReplayService
) -> None:
    store = str(tmp_path / "ag.sqlite3")
    _record_run(store)
    record = service.run(ReplayMode.STRICT, RUN_ID)
    assert record.strict_verified
    rebuilt = service.rebuild(RUN_ID)
    assert record.state_digest == rebuilt.state_digest

    # Introduce a changed behavior: the recording fires an extra behavior
    # that strict replay does not register, so the recorded derived events
    # can no longer be re-derived and the replay must fail the gate.
    def changed_fn(event: object, graph: object, ctx: object) -> None:
        graph.add_object("project", {"project_id": "made-by-changed-behavior"})  # type: ignore[attr-defined]

    changed = activegraph.behavior(name="gauntlet.test.changed", on=["gauntlet.test.ping"])(
        changed_fn
    )

    divergent_run = "campaign--replay-divergent"
    recording = adapter.open_runtime(store, divergent_run, extra_behaviors=(changed,))
    adapter.emit_event(recording, "gauntlet.test.ping", {})
    with pytest.raises(GateFailedError) as failure:
        service.strict(divergent_run)
    assert "diverged" in str(failure.value)


def test_fork_mode_reuses_the_recorded_prefix(tmp_path: Path, service: ReplayService) -> None:
    store = str(tmp_path / "ag.sqlite3")
    handle = _record_run(store)
    at_event = handle.runtime.graph.events[-1].id
    record, fork_handle = service.fork(RUN_ID, at_event, label="candidate")
    assert record.mode is ReplayMode.FORK
    assert record.forked_at_event == at_event
    assert record.fork_run_id == fork_handle.run_id
    runs = {run.run_id: run for run in adapter.list_runs(store)}
    assert runs[fork_handle.run_id].parent_run_id == RUN_ID
    # The fork projects the same prefix state it was created from.
    parent_beliefs = [obj for obj in handle.runtime.graph.all_objects() if obj.type == "belief"]
    fork_beliefs = [obj for obj in fork_handle.runtime.graph.all_objects() if obj.type == "belief"]
    assert [obj.data for obj in parent_beliefs] == [obj.data for obj in fork_beliefs]

    with pytest.raises(InvalidInvocationError):
        service.fork(RUN_ID, "evt_does_not_exist")
    with pytest.raises(InvalidInvocationError):
        service.run(ReplayMode.FORK, RUN_ID)  # at_event is required


def test_diff_mode_summarizes_divergence(tmp_path: Path, service: ReplayService) -> None:
    store = str(tmp_path / "ag.sqlite3")
    handle = _record_run(store)
    at_event = handle.runtime.graph.events[-1].id
    _, fork_handle = service.fork(RUN_ID, at_event)
    adapter.emit_event(
        fork_handle,
        "gauntlet.belief.recorded",
        {"belief_id": "belief:fork-only", "statement": "only in the fork"},
    )
    record = service.run(ReplayMode.DIFF, RUN_ID, fork_run_id=fork_handle.run_id)
    assert record.mode is ReplayMode.DIFF
    assert record.is_identical is False
    assert record.fork_run_id == fork_handle.run_id
    assert "gauntlet.belief.recorded" in record.fork_only_event_types

    with pytest.raises(InvalidInvocationError):
        service.diff(RUN_ID, "not-a-run")
    with pytest.raises(InvalidInvocationError):
        service.diff(RUN_ID, RUN_ID)
    with pytest.raises(InvalidInvocationError):
        service.run(ReplayMode.DIFF, RUN_ID)  # fork_run_id is required
    # A run that exists but is not a fork of the parent is rejected too.
    adapter.open_runtime(store, "campaign--unrelated")
    with pytest.raises(InvalidInvocationError):
        service.diff(RUN_ID, "campaign--unrelated")


def test_replay_records_persist_to_the_decisions_ledger(
    tmp_path: Path, service: ReplayService
) -> None:
    store = str(tmp_path / "ag.sqlite3")
    _record_run(store)
    record = service.rebuild(RUN_ID)
    ledger = LedgerStore(tmp_path / "ledger")
    loaded = ledger.load("decisions", record.record_id, ReplayRecordV1)
    assert loaded == record
    raw = json.loads(
        next((tmp_path / "ledger" / "decisions").glob("*.json")).read_text(encoding="utf-8")
    )
    assert raw["schema_version"] == "dev.gauntlet.replay-record/v1"
    assert raw["created_at"].endswith("Z")
    assert raw["state_digest"].startswith("sha256:")
