"""NeMo Relay ATOF-compatible JSONL importer and BLADE-style seam advisor.

Version assumption (documented for THIRD_PARTY/references): the current
ATOF-compatible JSONL stream begins with a header record carrying
``{"kind": "header", "atof_version": "1.0", ...}``. Version ``1.0`` is the
only supported version; an unsupported or missing version fails with
:class:`~gauntlet.errors.InvalidInvocationError` naming the version, never a
silent best-effort parse.

Mapping policy: only semantically compatible fields are mapped onto
:class:`~gauntlet.traces.NormalizedTraceEvent` (scopes, marks, tool/model
events, source IDs, timestamps). Every unrecognized field is retained in
``unrecognized`` -- ATOF data is never silently truncated.

BLADE-style failure-regime routing maps a documented failure regime onto
candidate :class:`~gauntlet.constants.ActionSeam` values. The mapping is
**advisory only**: each proposed seam must be experimentally tested; the
router never gains authority over experiments or promotion.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from gauntlet.constants import ActionSeam
from gauntlet.errors import InvalidInvocationError
from gauntlet.traces import NormalizedTraceEvent

SOURCE_FORMAT = "nemo-atof-jsonl/v1"
SUPPORTED_ATOF_VERSIONS = ("1.0",)

_EVENT_KINDS = frozenset(
    {"scope_start", "scope_end", "mark", "tool_event", "model_event"}
)

_RECOGNIZED_FIELDS = frozenset(
    {
        "kind",
        "id",
        "run_id",
        "scope_id",
        "parent_scope_id",
        "name",
        "timestamp",
        "source_id",
        "tool",
        "tool_version",
        "model",
        "model_version",
        "status",
        "error",
        "marks",
    }
)


def _detect_version(first_record: dict[str, Any]) -> str:
    version = first_record.get("atof_version")
    if version is None:
        raise InvalidInvocationError(
            "ATOF stream is missing the 'atof_version' header field",
            hint="the first JSONL record must be a header with atof_version",
        )
    return str(version)


def import_atof_jsonl(data: bytes) -> list[NormalizedTraceEvent]:
    """Import an ATOF-compatible JSONL stream as normalized events."""
    lines = [line for line in data.decode("utf-8").splitlines() if line.strip()]
    if not lines:
        raise InvalidInvocationError("ATOF payload is empty")
    records: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise InvalidInvocationError(
                f"ATOF line {index + 1} is not valid JSON: {error}"
            ) from error
        if not isinstance(record, dict):
            raise InvalidInvocationError(f"ATOF line {index + 1} is not a JSON object")
        records.append(record)

    header = records[0]
    if header.get("kind") != "header":
        raise InvalidInvocationError(
            "ATOF stream does not start with a header record",
            hint='expected {"kind": "header", "atof_version": "1.0", ...} on line 1',
        )
    version = _detect_version(header)
    if version not in SUPPORTED_ATOF_VERSIONS:
        raise InvalidInvocationError(
            f"unsupported ATOF version: {version!r}",
            hint=f"supported versions: {', '.join(SUPPORTED_ATOF_VERSIONS)}",
        )
    default_run = str(header.get("run_id", "atof-run"))
    default_source = str(header.get("source_id", "")) or None

    events: list[NormalizedTraceEvent] = []
    for index, record in enumerate(records[1:]):
        kind = record.get("kind")
        if kind not in _EVENT_KINDS:
            raise InvalidInvocationError(
                f"ATOF line {index + 2} has unknown event kind: {kind!r}",
                hint=f"expected one of {', '.join(sorted(_EVENT_KINDS))}",
            )
        unrecognized = {
            key: value for key, value in record.items() if key not in _RECOGNIZED_FIELDS
        }
        status_raw = str(record.get("status", "")).lower()
        status: Literal["ok", "error", "unknown"]
        if record.get("error") or status_raw in ("error", "failed"):
            status = "error"
        elif status_raw in ("ok", "success", "completed"):
            status = "ok"
        else:
            status = "unknown"
        marks = record.get("marks") or []
        events.append(
            NormalizedTraceEvent(
                run_id=str(record.get("run_id", default_run)),
                event_id=str(record.get("id", f"atof-{index}")),
                span_id=str(record["scope_id"]) if record.get("scope_id") else None,
                parent_id=str(record["parent_scope_id"])
                if record.get("parent_scope_id")
                else None,
                start_time=str(record["timestamp"]) if record.get("timestamp") else None,
                logical_time=index,
                model_name=str(record["model"]) if record.get("model") else None,
                model_version=str(record["model_version"])
                if record.get("model_version")
                else None,
                tool_name=str(record["tool"]) if record.get("tool") else None,
                tool_version=str(record["tool_version"])
                if record.get("tool_version")
                else None,
                operation=f"{kind}:{record.get('name', 'unnamed')}",
                status=status,
                error_id=str(record["error"]) if record.get("error") else None,
                invariant_ids=[str(mark) for mark in marks],
                source_format=SOURCE_FORMAT,
                unrecognized={
                    **unrecognized,
                    **(
                        {"atof_source_id": str(record.get("source_id", default_source))}
                        if (record.get("source_id") or default_source)
                        else {}
                    ),
                },
            )
        )
    if not events:
        raise InvalidInvocationError("ATOF stream contains a header but no events")
    return events


# ---------------------------------------------------------------------------
# BLADE-style failure-regime -> candidate action-seam advisory routing
# ---------------------------------------------------------------------------


class SeamAdvisoryV1(BaseModel):
    """Advisory mapping from a failure regime to candidate action seams."""

    model_config = ConfigDict(extra="forbid")

    failure_regime: str
    candidate_seams: list[ActionSeam] = Field(min_length=1)
    advisory: Literal[True] = True
    note: str = (
        "Advisory routing only: every proposed seam must be tested through a "
        "gauntlet experiment before any belief or decision depends on it."
    )


_FAILURE_REGIME_SEAMS: dict[str, list[ActionSeam]] = {
    "tool-misuse": [ActionSeam.TOOL_OR_EFFECT_ADAPTER],
    "prompt-drift": [ActionSeam.PROMPT_SKILL_OR_RETRIEVAL],
    "retrieval-miss": [ActionSeam.PROMPT_SKILL_OR_RETRIEVAL, ActionSeam.REFERENCE_DATA],
    "planning-error": [ActionSeam.WORKFLOW_OR_HARNESS],
    "model-capability": [ActionSeam.MODEL],
    "spec-gap": [ActionSeam.SPECIFICATION],
    "evaluator-blindspot": [ActionSeam.EVALUATOR],
    "data-quality": [ActionSeam.TRAINING_OR_EXAMPLE_DATA],
    "environment-flakiness": [ActionSeam.DETERMINISTIC_OPERATOR],
    "representation-gap": [ActionSeam.REPRESENTATION],
}


def advise_seams_for_regime(failure_regime: str) -> SeamAdvisoryV1:
    """Map a BLADE-style failure regime to candidate seams (advisory)."""
    seams = _FAILURE_REGIME_SEAMS.get(failure_regime)
    if seams is None:
        raise InvalidInvocationError(
            f"unknown failure regime: {failure_regime!r}",
            hint=f"known regimes: {', '.join(sorted(_FAILURE_REGIME_SEAMS))}",
        )
    return SeamAdvisoryV1(failure_regime=failure_regime, candidate_seams=list(seams))
