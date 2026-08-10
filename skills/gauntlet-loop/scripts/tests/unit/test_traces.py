"""Trace normalization, raw-digest preservation, and first divergence."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.adapters.generic_jsonl import import_generic_jsonl
from gauntlet.adapters.langsmith_cli import import_runs_export
from gauntlet.adapters.nemo_atof import import_atof_jsonl
from gauntlet.adapters.opentelemetry import import_otlp_json
from gauntlet.artifacts import ArtifactStore
from gauntlet.models import ArtifactStoreConfigV1, ObservationV1, ToolRefV1
from gauntlet.support import FrozenClock, SequentialIdGenerator
from gauntlet.traces import TraceIngestService, find_first_divergence

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def _fixture(relative: str) -> bytes:
    return (FIXTURES / relative).read_bytes()


def test_generic_jsonl_normalizes_and_retains_unknown_fields() -> None:
    events = import_generic_jsonl(_fixture("generic/success_run.jsonl"))

    assert len(events) == 5
    assert [event.logical_time for event in events] == [0, 1, 2, 3, 4]
    assert events[0].source_format == "generic-jsonl/v1"
    assert events[1].model_name == "planner-model"
    assert events[1].tokens == {"prompt": 120, "completion": 40}
    assert events[2].unrecognized == {"custom_annotation": "kept-in-raw"}


def test_atof_fixture_normalizes() -> None:
    events = import_atof_jsonl(_fixture("atof/valid_v1.jsonl"))
    assert len(events) == 5
    assert events[0].source_format == "nemo-atof-jsonl/v1"


def test_langsmith_fixture_normalizes() -> None:
    events = import_runs_export(_fixture("langsmith/runs_export.json"))
    assert len(events) == 2
    assert events[0].source_format == "langsmith-export/v1"


def test_otel_fixture_normalizes() -> None:
    events = import_otlp_json(_fixture("otel/otlp_spans.json"))
    assert len(events) == 2
    assert events[0].source_format == "opentelemetry-otlp-json/v1"


def test_ingest_preserves_raw_payload_by_digest(
    tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    store = ArtifactStore(
        tmp_path / "artifacts", config=ArtifactStoreConfigV1(), clock=clock, ids=ids
    )
    service = TraceIngestService(
        store, clock=clock, ids=ids, traces_dir=tmp_path / "traces"
    )
    payload = _fixture("generic/success_run.jsonl")

    result = service.ingest(
        payload,
        import_generic_jsonl,
        source_format="generic-jsonl/v1",
        producer=ToolRefV1(name="gauntlet-import"),
    )

    assert isinstance(result.observation, ObservationV1)
    stored = store.get_bytes(result.raw_digest.digest)
    assert stored == payload
    for event in result.events:
        assert event.raw_payload_digest == result.raw_digest.digest
    assert result.observation.values["event_count"] == 5
    assert (tmp_path / "traces").glob("*.events.jsonl")


def test_divergence_finds_exact_earliest_structural_mismatch() -> None:
    successful = import_generic_jsonl(_fixture("generic/success_run.jsonl"))
    failed = import_generic_jsonl(_fixture("generic/failure_run.jsonl"))

    report = find_first_divergence(successful, failed)

    assert report.identical is False
    assert report.divergence_index == 3
    assert len(report.shared_prefix_signatures) == 3
    assert report.successful_event_id == "s4"
    assert report.failed_event_id == "f4"
    assert report.fork_before_event_id == "f4"
    assert report.failed_signature == "call-tool|browser|-|error"


def test_divergence_is_deterministic_across_calls() -> None:
    successful = import_generic_jsonl(_fixture("generic/success_run.jsonl"))
    failed = import_generic_jsonl(_fixture("generic/failure_run.jsonl"))
    first = find_first_divergence(successful, failed)
    second = find_first_divergence(successful, failed)
    assert first == second


def test_identical_runs_report_no_divergence() -> None:
    events = import_generic_jsonl(_fixture("generic/success_run.jsonl"))
    report = find_first_divergence(events, events)
    assert report.identical is True
    assert report.divergence_index is None


def test_divergence_requires_non_empty_runs() -> None:
    events = import_generic_jsonl(_fixture("generic/success_run.jsonl"))
    from gauntlet.errors import InvalidInvocationError

    with pytest.raises(InvalidInvocationError):
        find_first_divergence([], events)
