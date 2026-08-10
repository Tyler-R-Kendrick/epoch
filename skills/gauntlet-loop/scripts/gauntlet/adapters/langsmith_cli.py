"""LangSmith official-CLI wrapper and export importer.

Assumptions (documented for THIRD_PARTY/references):

- the official CLI executable is ``langsmith``; commands are built as argv
  arrays and executed only through the injected ``ProcessRunner``;
- exports are JSON documents with a top-level ``runs`` (or ``examples`` /
  ``feedback`` / ``evaluations``) array; LangSmith identifiers (``id``,
  ``trace_id``, ``parent_run_id``, ``session_id``) are preserved verbatim;
- the API key is provided only through allowlisted environment variables
  passed to the subprocess; it is never written to any argv, file, or record,
  and CLI output is redacted before it is persisted anywhere.

Everything imported here is observational/evaluative: suggested fixes,
datasets, and evaluator outputs are candidate artifacts until independently
verified, and LangSmith never becomes the transactional promotion authority.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any, Literal

from gauntlet.errors import DependencyUnavailableError, InvalidInvocationError
from gauntlet.support import ProcessRunner
from gauntlet.traces import NormalizedTraceEvent

SOURCE_FORMAT = "langsmith-export/v1"

DEFAULT_ENV_ALLOWLIST = ("LANGSMITH_API_KEY", "LANGSMITH_ENDPOINT", "LANGCHAIN_API_KEY")

_INSTALL_HINT = (
    "install the official LangSmith CLI (pip install langsmith) and ensure "
    "`langsmith` is on PATH; configure integrations.langsmith_cli in "
    ".gauntlet/config.yaml"
)


def build_export_argv(
    *,
    project: str,
    start_time: str,
    end_time: str,
    query: str | None = None,
    limit: int | None = None,
) -> list[str]:
    """Build an argv array for exporting runs; explicit bounds are required."""
    if not project:
        raise InvalidInvocationError("a LangSmith project name is required")
    if not start_time or not end_time:
        raise InvalidInvocationError(
            "explicit start and end time bounds are required for a LangSmith export"
        )
    argv = [
        "langsmith",
        "runs",
        "export",
        "--project",
        project,
        "--start-time",
        start_time,
        "--end-time",
        end_time,
        "--format",
        "json",
    ]
    if query is not None:
        argv.extend(["--filter", query])
    if limit is not None:
        argv.extend(["--limit", str(limit)])
    return argv


class LangSmithCli:
    """Thin, fully injectable wrapper around the ``langsmith`` executable."""

    def __init__(
        self,
        runner: ProcessRunner,
        *,
        environment: Mapping[str, str] | None = None,
        env_allowlist: tuple[str, ...] = DEFAULT_ENV_ALLOWLIST,
    ) -> None:
        self._runner = runner
        self._environment = dict(environment or {})
        self._env_allowlist = env_allowlist

    def _subprocess_env(self) -> dict[str, str]:
        """Only allowlisted variables reach the CLI; nothing is persisted."""
        return {
            name: value
            for name, value in self._environment.items()
            if name in self._env_allowlist
        }

    def export_runs(
        self,
        *,
        project: str,
        start_time: str,
        end_time: str,
        query: str | None = None,
        limit: int | None = None,
        timeout_seconds: int = 300,
    ) -> bytes:
        """Run the export command and return raw stdout bytes."""
        argv = build_export_argv(
            project=project,
            start_time=start_time,
            end_time=end_time,
            query=query,
            limit=limit,
        )
        try:
            completed = self._runner.run(
                argv,
                env=self._subprocess_env(),
                timeout_seconds=timeout_seconds,
            )
        except InvalidInvocationError as error:
            raise DependencyUnavailableError(
                "the LangSmith CLI is not available", hint=_INSTALL_HINT
            ) from error
        if completed.exit_code != 0:
            raise InvalidInvocationError(
                f"langsmith export failed with exit code {completed.exit_code}: "
                f"{completed.stderr.strip()[:500]}"
            )
        return completed.stdout.encode("utf-8")


def _status(run: dict[str, Any]) -> Literal["ok", "error", "unknown"]:
    if run.get("error"):
        return "error"
    status = str(run.get("status", "")).lower()
    if status in ("success", "completed"):
        return "ok"
    if status in ("error", "failed"):
        return "error"
    return "unknown"


def import_runs_export(data: bytes) -> list[NormalizedTraceEvent]:
    """Normalize a LangSmith runs export; LangSmith IDs are preserved."""
    try:
        document = json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise InvalidInvocationError(
            f"LangSmith export is not valid JSON: {error}"
        ) from error
    runs = document.get("runs") if isinstance(document, dict) else None
    if not isinstance(runs, list) or not runs:
        raise InvalidInvocationError(
            "LangSmith export has no 'runs' array",
            hint="export runs with `langsmith runs export --format json`",
        )
    events: list[NormalizedTraceEvent] = []
    for index, run in enumerate(runs):
        if not isinstance(run, dict):
            raise InvalidInvocationError(f"LangSmith run at index {index} is not an object")
        run_id = str(run.get("id", f"run-{index}"))
        usage = run.get("usage") or {}
        tokens = {
            str(key): int(value)
            for key, value in dict(usage).items()
            if isinstance(value, int)
        }
        events.append(
            NormalizedTraceEvent(
                run_id=str(run.get("trace_id") or run_id),
                thread_id=str(run["session_id"]) if run.get("session_id") else None,
                event_id=run_id,
                span_id=run_id,
                parent_id=str(run["parent_run_id"]) if run.get("parent_run_id") else None,
                start_time=str(run["start_time"]) if run.get("start_time") else None,
                end_time=str(run["end_time"]) if run.get("end_time") else None,
                logical_time=index,
                model_name=str(run["model"]) if run.get("model") else None,
                tool_name=str(run["run_type"]) if run.get("run_type") else None,
                operation=str(run.get("name", "unknown-operation")),
                status=_status(run),
                tokens=tokens,
                error_id=str(run["error"]) if run.get("error") else None,
                source_format=SOURCE_FORMAT,
                unrecognized={
                    "langsmith_run_id": run_id,
                    "langsmith_trace_id": str(run.get("trace_id") or ""),
                    "extra": run.get("extra") or {},
                },
            )
        )
    return events


def import_records_export(data: bytes, *, kind: str) -> list[dict[str, Any]]:
    """Import dataset/annotation/evaluator exports as evaluative records.

    Returns plain dictionaries suitable for ``ObservationV1.values``; the
    caller preserves the raw export by digest via the trace ingest service.
    """
    if kind not in ("dataset", "annotation", "evaluator"):
        raise InvalidInvocationError(f"unknown LangSmith record kind: {kind!r}")
    try:
        document = json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise InvalidInvocationError(
            f"LangSmith {kind} export is not valid JSON: {error}"
        ) from error
    key = {"dataset": "examples", "annotation": "feedback", "evaluator": "evaluations"}[kind]
    records = document.get(key) if isinstance(document, dict) else None
    if not isinstance(records, list):
        raise InvalidInvocationError(f"LangSmith {kind} export has no '{key}' array")
    result: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            raise InvalidInvocationError(f"LangSmith {kind} record is not an object")
        result.append({"kind": kind, "langsmith_id": str(record.get("id", "")), **record})
    return result
