"""Generic JSONL trace contract importer (``dev.gauntlet.trace-jsonl/v1``).

Accepted shape
--------------

One JSON object per line. Recognized fields (all others are retained,
unmodified, in ``NormalizedTraceEvent.unrecognized`` -- never silently
discarded):

===================  =========================================================
field                meaning
===================  =========================================================
``contract``         optional; must equal ``dev.gauntlet.trace-jsonl/v1``
                     when present (any other value is rejected)
``run_id``           required; run/trajectory identifier
``event_id``         required; unique event identifier within the stream
``operation``        required; normalized operation name
``status``           ``ok`` | ``error`` | ``unknown`` (default ``unknown``)
``thread_id``        optional stream/thread identifier
``span_id``          optional span identifier (defaults to ``event_id``)
``parent_id``        optional parent span/event identifier
``causation_ids``    optional list of causal event identifiers
``correlation_id``   optional cross-stream correlation identifier
``start_time``       optional RFC 3339 string
``end_time``         optional RFC 3339 string
``logical_time``     optional integer per-stream order (defaults to the line
                     index, preserving source order)
``actor``            optional actor identity; ``actor_version`` its version
``model``            optional model identity; ``model_version`` its version
``tool``             optional tool identity; ``tool_version`` its version
``inputs``           optional list of ``sha256:<hex>`` input digests
``outputs``          optional list of ``sha256:<hex>`` output digests
``latency_ms``       optional number
``cost_usd``         optional number
``tokens``           optional object of integer token counts
``resources``        optional object of numeric resource measures
``error_id``         optional error code/identifier
``invariant_ids``    optional list of violated invariant identifiers
``evaluator_ids``    optional list of evaluator identifiers
``state_ref``        optional state link
``action_ref``       optional action link
``observation_ref``  optional observation link
===================  =========================================================

Per-stream order is the line order; no global total order is implied.
"""

from __future__ import annotations

import json
from typing import Any

from gauntlet.errors import InvalidInvocationError
from gauntlet.traces import NormalizedTraceEvent

SOURCE_FORMAT = "generic-jsonl/v1"
CONTRACT = "dev.gauntlet.trace-jsonl/v1"

_RECOGNIZED_FIELDS = frozenset(
    {
        "contract",
        "run_id",
        "event_id",
        "operation",
        "status",
        "thread_id",
        "span_id",
        "parent_id",
        "causation_ids",
        "correlation_id",
        "start_time",
        "end_time",
        "logical_time",
        "actor",
        "actor_version",
        "model",
        "model_version",
        "tool",
        "tool_version",
        "inputs",
        "outputs",
        "latency_ms",
        "cost_usd",
        "tokens",
        "resources",
        "error_id",
        "invariant_ids",
        "evaluator_ids",
        "state_ref",
        "action_ref",
        "observation_ref",
    }
)


def _str_or_none(record: dict[str, Any], key: str) -> str | None:
    value = record.get(key)
    return str(value) if value is not None else None


def _str_list(record: dict[str, Any], key: str) -> list[str]:
    value = record.get(key)
    if value is None:
        return []
    if not isinstance(value, list):
        raise InvalidInvocationError(f"generic JSONL field {key!r} must be a list")
    return [str(item) for item in value]


def import_generic_jsonl(data: bytes) -> list[NormalizedTraceEvent]:
    """Parse generic JSONL trace bytes into normalized events."""
    events: list[NormalizedTraceEvent] = []
    for index, line in enumerate(data.decode("utf-8").splitlines()):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise InvalidInvocationError(
                f"generic JSONL line {index + 1} is not valid JSON: {error}"
            ) from error
        if not isinstance(record, dict):
            raise InvalidInvocationError(f"generic JSONL line {index + 1} is not a JSON object")
        contract = record.get("contract")
        if contract is not None and contract != CONTRACT:
            raise InvalidInvocationError(
                f"unsupported generic trace contract: {contract!r}",
                hint=f"this importer accepts {CONTRACT}",
            )
        for required in ("run_id", "event_id", "operation"):
            if not record.get(required):
                raise InvalidInvocationError(
                    f"generic JSONL line {index + 1} is missing required field {required!r}"
                )
        status = record.get("status", "unknown")
        if status not in ("ok", "error", "unknown"):
            raise InvalidInvocationError(
                f"generic JSONL line {index + 1} has invalid status {status!r}"
            )
        unrecognized = {
            key: value for key, value in record.items() if key not in _RECOGNIZED_FIELDS
        }
        tokens_raw = record.get("tokens") or {}
        resources_raw = record.get("resources") or {}
        events.append(
            NormalizedTraceEvent(
                run_id=str(record["run_id"]),
                thread_id=_str_or_none(record, "thread_id"),
                event_id=str(record["event_id"]),
                span_id=_str_or_none(record, "span_id") or str(record["event_id"]),
                parent_id=_str_or_none(record, "parent_id"),
                causation_ids=_str_list(record, "causation_ids"),
                correlation_id=_str_or_none(record, "correlation_id"),
                start_time=_str_or_none(record, "start_time"),
                end_time=_str_or_none(record, "end_time"),
                logical_time=int(record.get("logical_time", index)),
                actor=_str_or_none(record, "actor"),
                actor_version=_str_or_none(record, "actor_version"),
                model_name=_str_or_none(record, "model"),
                model_version=_str_or_none(record, "model_version"),
                tool_name=_str_or_none(record, "tool"),
                tool_version=_str_or_none(record, "tool_version"),
                input_digests=_str_list(record, "inputs"),
                output_digests=_str_list(record, "outputs"),
                operation=str(record["operation"]),
                status=status,
                latency_ms=(
                    float(record["latency_ms"]) if record.get("latency_ms") is not None else None
                ),
                cost_usd=(
                    float(record["cost_usd"]) if record.get("cost_usd") is not None else None
                ),
                tokens={str(k): int(v) for k, v in dict(tokens_raw).items()},
                resources={str(k): float(v) for k, v in dict(resources_raw).items()},
                error_id=_str_or_none(record, "error_id"),
                invariant_ids=_str_list(record, "invariant_ids"),
                evaluator_ids=_str_list(record, "evaluator_ids"),
                state_ref=_str_or_none(record, "state_ref"),
                action_ref=_str_or_none(record, "action_ref"),
                observation_ref=_str_or_none(record, "observation_ref"),
                source_format=SOURCE_FORMAT,
                unrecognized=unrecognized,
            )
        )
    if not events:
        raise InvalidInvocationError("generic JSONL payload contains no trace events")
    return events
