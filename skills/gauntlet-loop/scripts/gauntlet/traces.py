"""Normalized trace model, redacting ingestion service, and divergence search.

Imported telemetry is normalized into :class:`NormalizedTraceEvent` without
discarding the raw source: the (redacted) source payload is preserved by
digest in the artifact store and every import produces an
:class:`gauntlet.models.ObservationV1`.

Imported traces are **observations**. They never become authoritative events
claiming the observed action actually occurred; reconciliation with the
effect executor or world event log is a separate, explicit step.

Ordering: per-stream order is preserved as given by the adapter (list order
plus ``logical_time``). No global total order is imposed across independent
streams; cross-stream relationships are explicit ``causation_ids`` /
``correlation_id`` links.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Any, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field

from gauntlet.canonical_json import canonical_bytes
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import DIGEST_PATTERN, DigestRefV1, ObservationV1, ToolRefV1
from gauntlet.paths import atomic_write
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, IdGenerator

TraceDigest = Annotated[str, Field(pattern=DIGEST_PATTERN)]


class NormalizedTraceEvent(BaseModel):
    """One normalized telemetry event (module-local; models.py is frozen).

    Field groups follow the generic normalized trace model in the execution
    brief: identity/causality, time, actor/model/tool identity, artifact
    digests, operation/status, measures, error/invariant/evaluator links,
    state/action/observation links, and source preservation.
    """

    model_config = ConfigDict(extra="forbid", protected_namespaces=())

    # identity and causality
    run_id: str
    thread_id: str | None = None
    event_id: str
    span_id: str | None = None
    parent_id: str | None = None
    causation_ids: list[str] = Field(default_factory=list)
    correlation_id: str | None = None

    # time (wall-clock strings as given by the source, plus per-stream order)
    start_time: str | None = None
    end_time: str | None = None
    logical_time: int = 0

    # actor / model / tool identity and version
    actor: str | None = None
    actor_version: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    tool_name: str | None = None
    tool_version: str | None = None

    # artifact linkage
    input_digests: list[TraceDigest] = Field(default_factory=list)
    output_digests: list[TraceDigest] = Field(default_factory=list)

    # operation
    operation: str
    status: Literal["ok", "error", "unknown"] = "unknown"

    # measures
    latency_ms: float | None = None
    cost_usd: float | None = None
    tokens: dict[str, int] = Field(default_factory=dict)
    resources: dict[str, float] = Field(default_factory=dict)

    # diagnostic links
    error_id: str | None = None
    invariant_ids: list[str] = Field(default_factory=list)
    evaluator_ids: list[str] = Field(default_factory=list)

    # epistemic links
    state_ref: str | None = None
    action_ref: str | None = None
    observation_ref: str | None = None

    # source preservation
    source_format: str
    raw_payload_digest: TraceDigest | None = None
    redaction_report: list[str] = Field(default_factory=list)
    unrecognized: dict[str, Any] = Field(default_factory=dict)


class RawPayloadStore(Protocol):
    """Narrow artifact-store seam used by trace ingestion."""

    def store_raw(self, data: bytes, media_type: str | None = None) -> DigestRefV1: ...


TraceImporter = Callable[[bytes], list[NormalizedTraceEvent]]


@dataclass(frozen=True)
class TraceImportResult:
    observation: ObservationV1
    events: list[NormalizedTraceEvent]
    raw_digest: DigestRefV1


class TraceIngestService:
    """Redact, preserve-by-digest, normalize, and record an observation."""

    def __init__(
        self,
        store: RawPayloadStore,
        *,
        clock: Clock,
        ids: IdGenerator,
        redactor: Redactor | None = None,
        traces_dir: Path | None = None,
    ) -> None:
        self._store = store
        self._clock = clock
        self._ids = ids
        self._redactor = redactor or Redactor()
        self._traces_dir = traces_dir

    def ingest(
        self,
        raw_payload: bytes,
        importer: TraceImporter,
        *,
        source_format: str,
        producer: ToolRefV1,
        scope: str = "trace-import",
        media_type: str | None = "application/jsonl",
    ) -> TraceImportResult:
        """Redact the payload, parse it, store it, and record an observation.

        Redaction runs *before* anything is parsed or persisted, so neither
        the preserved raw blob nor any normalized event can carry a secret
        that the redactor recognizes.
        """
        text = raw_payload.decode("utf-8", errors="replace")
        redacted_text, report = self._redactor.redact_text(text)
        redacted_bytes = redacted_text.encode("utf-8")
        events = importer(redacted_bytes)
        raw_digest = self._store.store_raw(redacted_bytes, media_type)
        for event in events:
            event.raw_payload_digest = raw_digest.digest
            if report:
                event.redaction_report = list(report)
        observation = ObservationV1(
            observation_id=self._ids.new_id("obs"),
            producer=producer,
            scope=scope,
            raw_digest=raw_digest,
            measured_at=self._clock.now(),
            values={
                "source_format": source_format,
                "event_count": len(events),
                "run_ids": sorted({event.run_id for event in events}),
            },
            redaction_report=list(report),
        )
        if self._traces_dir is not None:
            self._persist(observation, events)
        return TraceImportResult(observation=observation, events=events, raw_digest=raw_digest)

    def _persist(self, observation: ObservationV1, events: list[NormalizedTraceEvent]) -> None:
        safe_id = observation.observation_id.replace(":", "__")
        obs_path = self._traces_dir_required() / f"{safe_id}.observation.json"
        atomic_write(obs_path, canonical_bytes(observation.model_dump(mode="json")))
        lines = [
            json.dumps(event.model_dump(mode="json"), sort_keys=True, ensure_ascii=False)
            for event in events
        ]
        events_path = self._traces_dir_required() / f"{safe_id}.events.jsonl"
        atomic_write(events_path, ("\n".join(lines) + "\n").encode("utf-8"))

    def _traces_dir_required(self) -> Path:
        if self._traces_dir is None:  # pragma: no cover - guarded by caller
            raise InvalidInvocationError("traces_dir is not configured")
        return self._traces_dir


# ---------------------------------------------------------------------------
# Deterministic alignment and first divergence
# ---------------------------------------------------------------------------


def operation_signature(event: NormalizedTraceEvent) -> str:
    """Normalized structural signature of one event.

    Deliberately excludes wall-clock time, IDs, and measures so that two
    runs of the same workflow align on structure, not on noise.
    """
    return "|".join(
        (
            event.operation,
            event.tool_name or "-",
            event.model_name or "-",
            event.status,
        )
    )


class DivergenceReportV1(BaseModel):
    """Earliest structurally meaningful divergence between two runs.

    ``fork_before_event_id`` names the first divergent event of the failed
    run: forking immediately before it reuses the longest shared prefix.
    The comparison is a deterministic first-mismatch scan over normalized
    operation signatures (a degenerate but order-preserving LCS: the shared
    prefix is always a common subsequence, and the first mismatch is the
    earliest structural difference).
    """

    model_config = ConfigDict(extra="forbid")

    identical: bool
    shared_prefix_signatures: list[str]
    divergence_index: int | None = None
    successful_signature: str | None = None
    failed_signature: str | None = None
    successful_event_id: str | None = None
    failed_event_id: str | None = None
    fork_before_event_id: str | None = None


def find_first_divergence(
    successful: Sequence[NormalizedTraceEvent],
    failed: Sequence[NormalizedTraceEvent],
) -> DivergenceReportV1:
    """Compare a successful run against a failed run; deterministic."""
    if not successful or not failed:
        raise InvalidInvocationError("divergence analysis needs two non-empty runs")
    success_signatures = [operation_signature(event) for event in successful]
    failure_signatures = [operation_signature(event) for event in failed]
    prefix_length = 0
    for left, right in zip(success_signatures, failure_signatures, strict=False):
        if left != right:
            break
        prefix_length += 1
    if prefix_length == len(success_signatures) == len(failure_signatures):
        return DivergenceReportV1(
            identical=True,
            shared_prefix_signatures=success_signatures,
        )
    successful_signature = (
        success_signatures[prefix_length] if prefix_length < len(success_signatures) else None
    )
    failed_signature = (
        failure_signatures[prefix_length] if prefix_length < len(failure_signatures) else None
    )
    successful_event = successful[prefix_length] if prefix_length < len(successful) else None
    failed_event = failed[prefix_length] if prefix_length < len(failed) else None
    return DivergenceReportV1(
        identical=False,
        shared_prefix_signatures=success_signatures[:prefix_length],
        divergence_index=prefix_length,
        successful_signature=successful_signature,
        failed_signature=failed_signature,
        successful_event_id=successful_event.event_id if successful_event else None,
        failed_event_id=failed_event.event_id if failed_event else None,
        fork_before_event_id=failed_event.event_id if failed_event else None,
    )
