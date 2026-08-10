"""Adapter imports: mocked LangSmith CLI, ATOF, OTel, and redaction safety."""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from gauntlet.adapters.generic_jsonl import import_generic_jsonl
from gauntlet.adapters.langsmith_cli import (
    LangSmithCli,
    build_export_argv,
    import_records_export,
    import_runs_export,
)
from gauntlet.adapters.nemo_atof import (
    SeamAdvisoryV1,
    advise_seams_for_regime,
    import_atof_jsonl,
)
from gauntlet.adapters.opentelemetry import (
    GauntletSpanEmitter,
    GauntletSpanMetadata,
    import_otlp_json,
)
from gauntlet.artifacts import ArtifactStore
from gauntlet.constants import ActionSeam
from gauntlet.errors import DependencyUnavailableError, InvalidInvocationError
from gauntlet.models import ArtifactStoreConfigV1, TelemetryConfigV1, ToolRefV1
from gauntlet.support import CompletedProcess, FrozenClock, SequentialIdGenerator
from gauntlet.traces import TraceIngestService

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


@dataclass
class FakeRunner:
    stdout: str = ""
    exit_code: int = 0
    missing_executables: set[str] = field(default_factory=set)
    calls: list[list[str]] = field(default_factory=list)
    envs: list[dict[str, str]] = field(default_factory=list)

    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess:
        if argv[0] in self.missing_executables:
            raise InvalidInvocationError(f"executable not found: {argv[0]!r}")
        self.calls.append(list(argv))
        self.envs.append(dict(env or {}))
        return CompletedProcess(
            argv=tuple(argv), exit_code=self.exit_code, stdout=self.stdout, stderr=""
        )


# ---------------------------------------------------------------------------
# LangSmith (mocked CLI)
# ---------------------------------------------------------------------------


def test_langsmith_export_uses_argv_and_env_allowlist() -> None:
    payload = (FIXTURES / "langsmith" / "runs_export.json").read_text(encoding="utf-8")
    runner = FakeRunner(stdout=payload)
    cli = LangSmithCli(
        runner,
        environment={
            "LANGSMITH_API_KEY": "sk-FAKEFAKEFAKE1234567890",
            "HOME": "/home/user",
            "AWS_SECRET_ACCESS_KEY": "should-not-pass",
        },
    )

    raw = cli.export_runs(
        project="gauntlet-demo",
        start_time="2026-03-01T00:00:00Z",
        end_time="2026-03-02T00:00:00Z",
        query='eq(run_type, "chain")',
    )

    argv = runner.calls[0]
    assert argv[:3] == ["langsmith", "runs", "export"]
    assert "--project" in argv and "gauntlet-demo" in argv
    assert "--start-time" in argv and "--end-time" in argv
    # the API key travels only via the allowlisted env, never in argv
    assert all("sk-FAKE" not in part for part in argv)
    assert set(runner.envs[0]) == {"LANGSMITH_API_KEY"}

    events = import_runs_export(raw)
    assert len(events) == 2
    assert events[0].unrecognized["langsmith_run_id"] == "ls-run-001"
    assert events[1].parent_id == "ls-run-001"
    assert events[1].status == "error"
    assert events[0].tokens == {"prompt_tokens": 200, "completion_tokens": 80}


def test_langsmith_requires_explicit_bounds() -> None:
    with pytest.raises(InvalidInvocationError):
        build_export_argv(project="p", start_time="", end_time="2026-01-01T00:00:00Z")


def test_langsmith_missing_cli_gives_installation_guidance() -> None:
    cli = LangSmithCli(FakeRunner(missing_executables={"langsmith"}))
    with pytest.raises(DependencyUnavailableError) as excinfo:
        cli.export_runs(
            project="p",
            start_time="2026-03-01T00:00:00Z",
            end_time="2026-03-02T00:00:00Z",
        )
    assert "install" in (excinfo.value.hint or "").lower()


def test_langsmith_dataset_records_import_as_evaluative() -> None:
    payload = b'{"examples": [{"id": "ex-1", "inputs": {"q": "demo"}}]}'
    records = import_records_export(payload, kind="dataset")
    assert records[0]["kind"] == "dataset"
    assert records[0]["langsmith_id"] == "ex-1"


# ---------------------------------------------------------------------------
# ATOF
# ---------------------------------------------------------------------------


def test_atof_import_preserves_scopes_marks_and_source_ids() -> None:
    events = import_atof_jsonl((FIXTURES / "atof" / "valid_v1.jsonl").read_bytes())

    assert len(events) == 5
    model_event = events[1]
    assert model_event.model_name == "nemo-llm"
    assert model_event.model_version == "24.05"
    assert model_event.unrecognized["relay_extension"] == {"queue": "gpu-a"}
    assert model_event.unrecognized["atof_source_id"] == "relay-node-3"
    tool_event = events[2]
    assert tool_event.tool_name == "vector-search"
    assert tool_event.status == "error"
    mark_event = events[3]
    assert mark_event.invariant_ids == ["inv:latency-budget"]
    assert all(event.span_id == "scope-root" for event in events)


def test_atof_unsupported_version_fails_naming_the_version() -> None:
    with pytest.raises(InvalidInvocationError, match="9.0"):
        import_atof_jsonl((FIXTURES / "atof" / "unsupported_version.jsonl").read_bytes())


def test_blade_regime_mapping_is_advisory() -> None:
    advisory = advise_seams_for_regime("retrieval-miss")
    assert isinstance(advisory, SeamAdvisoryV1)
    assert advisory.advisory is True
    assert ActionSeam.PROMPT_SKILL_OR_RETRIEVAL in advisory.candidate_seams
    with pytest.raises(InvalidInvocationError):
        advise_seams_for_regime("made-up-regime")


# ---------------------------------------------------------------------------
# OpenTelemetry
# ---------------------------------------------------------------------------


def test_otlp_json_import_maps_spans() -> None:
    events = import_otlp_json((FIXTURES / "otel" / "otlp_spans.json").read_bytes())

    assert len(events) == 2
    root, child = events
    assert root.status == "ok"
    assert root.latency_ms == 250.0
    assert child.parent_id == root.span_id
    assert child.status == "error"
    assert child.error_id == "invariant violated"
    assert child.unrecognized["attributes"]["gauntlet.evaluator"] == "eval:schema"


def test_otel_emitter_emits_metadata_only_spans() -> None:
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    emitter = GauntletSpanEmitter(
        TelemetryConfigV1(enabled=True, sample_ratio=1.0),
        tracer_provider=provider,
    )

    emitted = emitter.emit(
        "evaluator",
        "run schema evaluator",
        GauntletSpanMetadata(project="demo", campaign="campaign:demo", evaluator="eval:schema"),
        raw_content={"prompt": "SECRET raw prompt"},
    )

    assert emitted is True
    spans = exporter.get_finished_spans()
    assert len(spans) == 1
    attributes = dict(spans[0].attributes or {})
    assert attributes["gauntlet.kind"] == "evaluator"
    assert attributes["gauntlet.campaign"] == "campaign:demo"
    # raw content stays out by default
    assert not any(key.startswith("gauntlet.raw.") for key in attributes)


def test_otel_emitter_honors_sampling_and_enablement() -> None:
    from opentelemetry.sdk.trace import TracerProvider

    disabled = GauntletSpanEmitter(
        TelemetryConfigV1(enabled=False), tracer_provider=TracerProvider()
    )
    assert disabled.emit("command", "x", GauntletSpanMetadata()) is False

    sampled_out = GauntletSpanEmitter(
        TelemetryConfigV1(enabled=True, sample_ratio=0.0),
        tracer_provider=TracerProvider(),
    )
    assert sampled_out.emit("command", "x", GauntletSpanMetadata()) is False


def test_otel_missing_dependency_raises_with_install_hint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(sys.modules, "opentelemetry", None)
    with pytest.raises(DependencyUnavailableError) as excinfo:
        GauntletSpanEmitter(TelemetryConfigV1(enabled=True))
    assert "otel" in (excinfo.value.hint or "")


# ---------------------------------------------------------------------------
# redaction: imported secrets never reach disk
# ---------------------------------------------------------------------------


def test_secret_fixtures_never_leak_into_persisted_bytes(
    tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    store = ArtifactStore(
        tmp_path / "artifacts", config=ArtifactStoreConfigV1(), clock=clock, ids=ids
    )
    service = TraceIngestService(
        store, clock=clock, ids=ids, traces_dir=tmp_path / "traces"
    )
    payload = (FIXTURES / "secrets" / "leaky_trace.jsonl").read_bytes()
    assert b"sk-FAKEFAKEFAKE1234567890" in payload  # fixture really is leaky

    result = service.ingest(
        payload,
        import_generic_jsonl,
        source_format="generic-jsonl/v1",
        producer=ToolRefV1(name="gauntlet-import"),
    )

    assert result.observation.redaction_report  # redaction actually fired
    persisted = [path for path in tmp_path.rglob("*") if path.is_file()]
    assert persisted
    for path in persisted:
        data = path.read_bytes()
        assert b"sk-FAKEFAKEFAKE1234567890" not in data
        assert b"MIIFAKEKEYMATERIALDONOTUSE" not in data
