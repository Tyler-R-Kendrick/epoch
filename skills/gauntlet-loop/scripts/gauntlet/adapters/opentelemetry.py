"""OpenTelemetry adapter: span emission (``otel`` extra) and OTLP-JSON import.

Emission is metadata-by-default: raw prompt/response content is only attached
when ``TelemetryConfigV1.include_raw_content`` is true. All gauntlet metadata
uses namespaced ``gauntlet.*`` attributes. Sampling honors
``TelemetryConfigV1.sample_ratio`` deterministically (hash of the event key),
so tests and replays see stable sampling decisions.

Trace delivery is never part of an authorization or promotion quorum: spans
are telemetry, and the OTLP importer produces observations only.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from types import ModuleType
from typing import Any

from gauntlet.errors import DependencyUnavailableError, InvalidInvocationError
from gauntlet.models import TelemetryConfigV1
from gauntlet.traces import NormalizedTraceEvent

SOURCE_FORMAT = "opentelemetry-otlp-json/v1"

SPAN_KINDS = (
    "command",
    "intent",
    "evaluator",
    "experiment",
    "promotion",
    "release",
    "adapter",
)

_OTEL_INSTALL_HINT = (
    "install the otel extra: uv sync --extra otel "
    "(opentelemetry-api and opentelemetry-sdk)"
)


def _require_otel_trace() -> ModuleType:
    try:
        from opentelemetry import trace
    except ImportError as error:
        raise DependencyUnavailableError(
            "opentelemetry is not installed", hint=_OTEL_INSTALL_HINT
        ) from error
    return trace


@dataclass(frozen=True)
class GauntletSpanMetadata:
    """Namespaced gauntlet.* span attributes (metadata, never raw content)."""

    project: str | None = None
    campaign: str | None = None
    spec_digest: str | None = None
    branch: str | None = None
    event_id: str | None = None
    candidate: str | None = None
    evaluator: str | None = None
    decision: str | None = None

    def as_attributes(self) -> dict[str, str]:
        pairs = {
            "gauntlet.project": self.project,
            "gauntlet.campaign": self.campaign,
            "gauntlet.spec_digest": self.spec_digest,
            "gauntlet.branch": self.branch,
            "gauntlet.event": self.event_id,
            "gauntlet.candidate": self.candidate,
            "gauntlet.evaluator": self.evaluator,
            "gauntlet.decision": self.decision,
        }
        return {key: value for key, value in pairs.items() if value is not None}


def _deterministic_sample(key: str, ratio: float) -> bool:
    if ratio >= 1.0:
        return True
    if ratio <= 0.0:
        return False
    bucket = int.from_bytes(hashlib.sha256(key.encode("utf-8")).digest()[:8], "big")
    return (bucket / 2**64) < ratio


class GauntletSpanEmitter:
    """Emit gauntlet lifecycle spans through the installed OTel API."""

    def __init__(
        self,
        config: TelemetryConfigV1,
        *,
        tracer_provider: Any | None = None,
    ) -> None:
        self._config = config
        trace = _require_otel_trace()
        if tracer_provider is not None:
            self._tracer = tracer_provider.get_tracer("gauntlet-loop")
        else:
            self._tracer = trace.get_tracer("gauntlet-loop")

    def emit(
        self,
        kind: str,
        name: str,
        metadata: GauntletSpanMetadata,
        *,
        ok: bool = True,
        raw_content: dict[str, str] | None = None,
    ) -> bool:
        """Emit one span; returns False when sampled out or disabled."""
        if kind not in SPAN_KINDS:
            raise InvalidInvocationError(
                f"unknown gauntlet span kind: {kind!r}",
                hint=f"expected one of {', '.join(SPAN_KINDS)}",
            )
        if not self._config.enabled:
            return False
        sample_key = f"{kind}:{name}:{metadata.event_id or ''}"
        if not _deterministic_sample(sample_key, self._config.sample_ratio):
            return False
        attributes: dict[str, str] = {"gauntlet.kind": kind, **metadata.as_attributes()}
        if raw_content and self._config.include_raw_content:
            for key, value in raw_content.items():
                attributes[f"gauntlet.raw.{key}"] = value
        with self._tracer.start_as_current_span(f"gauntlet.{kind}") as span:
            span.set_attributes(attributes)
            if not ok:
                span.set_attribute("gauntlet.status", "error")
        return True


# ---------------------------------------------------------------------------
# OTLP-JSON file import (pure JSON parsing; no otel dependency required)
# ---------------------------------------------------------------------------


def _nanos_to_rfc3339(nanos: int) -> str:
    stamp = datetime.fromtimestamp(nanos / 1_000_000_000, UTC)
    return stamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _attribute_value(value: dict[str, Any]) -> Any:
    for key in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if key in value:
            return value[key]
    return value


def import_otlp_json(data: bytes) -> list[NormalizedTraceEvent]:
    """Import an OTLP/JSON file export (``resourceSpans`` tree) as events."""
    try:
        document = json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise InvalidInvocationError(f"OTLP-JSON payload is not valid JSON: {error}") from error
    if not isinstance(document, dict) or "resourceSpans" not in document:
        raise InvalidInvocationError(
            "OTLP-JSON payload is missing 'resourceSpans'",
            hint="expected an OTLP/JSON trace file export",
        )
    events: list[NormalizedTraceEvent] = []
    index = 0
    for resource_spans in document.get("resourceSpans", []):
        for scope_spans in resource_spans.get("scopeSpans", []):
            scope = scope_spans.get("scope", {})
            for span in scope_spans.get("spans", []):
                attributes = {
                    str(attribute.get("key")): _attribute_value(attribute.get("value", {}))
                    for attribute in span.get("attributes", [])
                }
                status = span.get("status", {})
                status_code = status.get("code", 0)
                start_nanos = int(span.get("startTimeUnixNano", 0))
                end_nanos = int(span.get("endTimeUnixNano", 0))
                latency_ms = (
                    (end_nanos - start_nanos) / 1_000_000
                    if start_nanos and end_nanos
                    else None
                )
                events.append(
                    NormalizedTraceEvent(
                        run_id=str(span.get("traceId", "unknown-trace")),
                        event_id=str(span.get("spanId", f"span-{index}")),
                        span_id=str(span.get("spanId", f"span-{index}")),
                        parent_id=str(span["parentSpanId"])
                        if span.get("parentSpanId")
                        else None,
                        start_time=_nanos_to_rfc3339(start_nanos) if start_nanos else None,
                        end_time=_nanos_to_rfc3339(end_nanos) if end_nanos else None,
                        logical_time=index,
                        tool_name=str(scope.get("name")) if scope.get("name") else None,
                        tool_version=str(scope.get("version"))
                        if scope.get("version")
                        else None,
                        operation=str(span.get("name", "unknown-operation")),
                        status="error" if status_code == 2 else "ok",
                        latency_ms=latency_ms,
                        error_id=str(status.get("message"))
                        if status_code == 2 and status.get("message")
                        else None,
                        source_format=SOURCE_FORMAT,
                        unrecognized={"attributes": attributes} if attributes else {},
                    )
                )
                index += 1
    if not events:
        raise InvalidInvocationError("OTLP-JSON payload contains no spans")
    return events
