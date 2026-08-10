"""Microsoft Agent Framework (MAF) declarative workflow runner.

This adapter executes the YAML generated from a ``WorkflowPlanV1`` through
``agent_framework_declarative``'s ``WorkflowFactory``. It registers exactly
one Python function tool, ``gauntlet_step``, which runs one gauntlet CLI step
via an injected ``StepExecutor`` and maps CLI exit codes onto workflow
behavior. The YAML stays literal-only (no PowerFx ``=`` expressions, which
would require a dotnet runtime); all retries, gating, and authority checks
happen inside the tool.

Verified runtime behavior of agent-framework-core 1.13.0 +
agent-framework-declarative 1.0.1 (live spike, not web docs):

- ``RequestExternalInput`` actions genuinely pause the run: ``Workflow.run``
  returns with state ``IDLE_WITH_PENDING_REQUESTS`` and pending request-info
  events, and ``FileCheckpointStorage`` persists a checkpoint whose
  ``pending_request_info_events`` carry the request IDs.
- True cross-process checkpoint resume works: build a fresh workflow from the
  same YAML and call ``run(checkpoint_id=..., responses={request_id:
  ExternalInputResponse(user_input=...)})``. Reading those checkpoints back
  requires ``allowed_checkpoint_types`` to include the declarative package's
  internal message types (see ``CHECKPOINT_ALLOWED_TYPES``).
- Exceptions raised inside a registered function tool are swallowed by
  ``InvokeFunctionToolExecutor`` (logged, then the workflow continues to the
  next action). A tool therefore CANNOT end the workflow by raising. Instead
  the shared ``StepSession`` sets a halted status; every subsequent
  ``gauntlet_step`` invocation short-circuits to a recorded skip, and the
  runner derives the final run status from the journal.

Resume strategy (both paths implemented):

1. Pause at a ``RequestExternalInput`` approval gate: true checkpoint resume
   via ``checkpoint_id`` + ``ExternalInputResponse`` (native MAF replay; the
   already-completed actions never re-execute).
2. Pause raised INSIDE ``gauntlet_step`` (CLI exit 3, or a missing committed
   R2+ intent): MAF cannot checkpoint mid-action, so resume reloads the
   workflow, re-runs it from the start, and skips journal-completed steps
   idempotently ("journal replay").

Authority is defense in depth: R2+ steps get an approval gate in the YAML,
``gauntlet_step`` additionally verifies a committed write-ahead intent via an
injected verifier before executing, and the gauntlet CLI enforces authority
server-side regardless (it exits 3/9 without a committed intent), so a
hand-edited workflow cannot bypass it.
"""

from __future__ import annotations

import asyncio
import json
import time
import warnings
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from gauntlet.constants import ActionClass, ExitCode
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import WorkflowPlanV1
from gauntlet.paths import atomic_write_text
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, SystemClock

with warnings.catch_warnings():
    # agent_framework_declarative emits an ExperimentalWarning about
    # AgentFactory on import; it is noise for this literal-only usage.
    warnings.simplefilter("ignore")
    from agent_framework import FileCheckpointStorage
    from agent_framework.declarative import ExternalInputResponse, WorkflowFactory

#: Internal declarative message types pickled into checkpoints; without this
#: allowlist ``FileCheckpointStorage`` refuses to read its own files back.
CHECKPOINT_ALLOWED_TYPES: tuple[str, ...] = (
    "agent_framework_declarative._workflows._declarative_base:ActionComplete",
    "agent_framework_declarative._workflows._executors_external_input:ExternalInputRequest",
    "agent_framework_declarative._workflows._executors_external_input:ExternalInputResponse",
)

JOURNAL_SCHEMA = "dev.gauntlet.workflow-journal/v1"

#: Higher authority classes require a committed write-ahead intent.
_ELEVATED_CLASSES = (ActionClass.R2.value, ActionClass.R3.value, ActionClass.R4.value)

_MAX_BACKOFF_SECONDS = 30.0
_OUTPUT_EXCERPT_CHARS = 2000

RunStatus = str  # "running" | "completed" | "paused" | "failed" | "inconclusive"
#                  | "conflict" | "outcome-unknown"


@dataclass(frozen=True)
class StepResult:
    """Outcome of one gauntlet CLI attempt as seen by the executor seam."""

    exit_code: int
    stdout: str = ""
    stderr: str = ""


class StepExecutor(Protocol):
    """Runs one gauntlet CLI command; the CLI wires the real subprocess."""

    def __call__(self, command: Sequence[str], *, timeout_seconds: int) -> StepResult: ...


Sleeper = Callable[[float], None]
IntentVerifier = Callable[[str, str], bool]
"""``(step_id, action_class) -> bool``: is a committed write-ahead intent recorded?"""


def _default_sleep(seconds: float) -> None:
    """Default backoff sleeper; tests inject a fake instead."""
    time.sleep(seconds)


class RunJournal:
    """Append-only, redacted record of every step attempt for one run.

    Persisted as a single JSON document under the workflow's checkpoint
    directory. The journal is the source of truth for the run status (MAF's
    ``WorkflowRunState`` stays ``IDLE_WITH_PENDING_REQUESTS`` even after a
    successful checkpoint resume) and for idempotent journal-replay resume.
    """

    def __init__(
        self,
        path: Path,
        *,
        workflow_name: str,
        plan_digest: str,
        clock: Clock,
        redactor: Redactor,
    ) -> None:
        self.path = path
        self.workflow_name = workflow_name
        self.plan_digest = plan_digest
        self._clock = clock
        self._redactor = redactor
        self.status: RunStatus = "running"
        self.status_detail: str | None = None
        self.advice: str | None = None
        self.attempts: list[dict[str, Any]] = []
        self.completed_steps: list[str] = []
        self.pending_request_ids: list[str] = []

    @property
    def halted(self) -> bool:
        return self.status not in ("running", "completed")

    @classmethod
    def load(
        cls,
        path: Path,
        *,
        workflow_name: str,
        plan_digest: str,
        clock: Clock,
        redactor: Redactor,
    ) -> RunJournal | None:
        """Load an existing journal; returns None when absent or for a
        different plan digest (a repaired plan starts with a fresh journal)."""
        if not path.is_file():
            return None
        document = json.loads(path.read_text(encoding="utf-8"))
        if document.get("plan_digest") != plan_digest:
            return None
        journal = cls(
            path,
            workflow_name=workflow_name,
            plan_digest=plan_digest,
            clock=clock,
            redactor=redactor,
        )
        journal.status = str(document.get("status", "running"))
        journal.status_detail = document.get("status_detail")
        journal.advice = document.get("advice")
        journal.attempts = list(document.get("attempts", []))
        journal.completed_steps = list(document.get("completed_steps", []))
        journal.pending_request_ids = list(document.get("pending_request_ids", []))
        return journal

    def record_attempt(self, entry: Mapping[str, Any]) -> dict[str, Any]:
        """Redact and append one observation-style attempt record."""
        redacted, report = self._redactor.redact_value(dict(entry))
        record: dict[str, Any] = dict(redacted)
        record["kind"] = "workflow-step-attempt"
        record["recorded_at"] = self._clock.now()
        if report:
            record["redaction_report"] = report
        self.attempts.append(record)
        self.flush()
        return record

    def mark_step_complete(self, step_id: str) -> None:
        if step_id not in self.completed_steps:
            self.completed_steps.append(step_id)
        self.flush()

    def halt(self, status: RunStatus, *, detail: str, advice: str | None = None) -> None:
        self.status = status
        self.status_detail = detail
        self.advice = advice
        self.flush()

    def set_status(self, status: RunStatus, *, detail: str | None = None) -> None:
        self.status = status
        self.status_detail = detail
        self.flush()

    def set_pending_requests(self, request_ids: Sequence[str]) -> None:
        self.pending_request_ids = list(request_ids)
        self.flush()

    def flush(self) -> None:
        document = {
            "schema_version": JOURNAL_SCHEMA,
            "workflow_name": self.workflow_name,
            "plan_digest": self.plan_digest,
            "status": self.status,
            "status_detail": self.status_detail,
            "advice": self.advice,
            "completed_steps": self.completed_steps,
            "pending_request_ids": self.pending_request_ids,
            "attempts": self.attempts,
            "updated_at": self._clock.now(),
        }
        atomic_write_text(self.path, json.dumps(document, indent=2, sort_keys=True) + "\n")


class StepSession:
    """Exit-code semantics for ``gauntlet_step``, independent of MAF.

    Per-attempt mapping (exit code -> behavior):

    - 0: success; step marked complete.
    - in ``retry_on_exit_codes`` (default ``[8]``) with attempts left:
      bounded exponential backoff via the injected sleeper, then retry.
      Exit 7 is stripped from the retry set and is NEVER retried.
    - 3: approval required; the run halts with a persisted ``paused`` status
      (resume re-runs after approval).
    - 4: honor ``on_gate_failure``: ``end`` halts with ``failed``;
      ``continue`` records the failure and lets the workflow proceed.
    - 5: inconclusive; halt, never promote.
    - 6: conflict; halt with re-fork advice.
    - 7: outcome unknown; halt with reconcile advice, never retried.
    - 2 and 9: fatal; halt immediately.
    - 8 with retries exhausted, or any other nonzero code: halt as failed.
    """

    def __init__(
        self,
        journal: RunJournal,
        executor: StepExecutor,
        *,
        sleeper: Sleeper,
        intent_verifier: IntentVerifier | None = None,
        backoff_base_seconds: float = 0.5,
    ) -> None:
        self._journal = journal
        self._executor = executor
        self._sleeper = sleeper
        self._intent_verifier = intent_verifier
        self._backoff_base = backoff_base_seconds

    def invoke(
        self,
        *,
        step_id: str,
        command: Sequence[str],
        action_class: str = "R0",
        require_approval: bool = False,
        max_retries: int = 0,
        retry_on_exit_codes: Sequence[int] | None = None,
        on_gate_failure: str = "end",
        timeout_seconds: int = 600,
    ) -> dict[str, Any]:
        journal = self._journal
        if journal.halted:
            return journal.record_attempt(
                {"step_id": step_id, "outcome": "skipped", "reason": journal.status}
            )
        if step_id in journal.completed_steps:
            return journal.record_attempt({"step_id": step_id, "outcome": "already-complete"})
        if action_class in _ELEVATED_CLASSES and not (
            self._intent_verifier is not None and self._intent_verifier(step_id, action_class)
        ):
            record = journal.record_attempt(
                {
                    "step_id": step_id,
                    "outcome": "intent-not-committed",
                    "action_class": action_class,
                }
            )
            journal.halt(
                "paused",
                detail=f"step {step_id!r} ({action_class}) has no committed write-ahead intent",
                advice=(
                    "commit an intent with `gauntlet intent approve`, "
                    "then `gauntlet workflow resume`"
                ),
            )
            return record
        # Exit 7 (outcome unknown) is never retried, even when configured.
        retry_codes = {
            code
            for code in (retry_on_exit_codes if retry_on_exit_codes is not None else [8])
            if code != ExitCode.OUTCOME_UNKNOWN
        }
        attempt = 0
        while True:
            attempt += 1
            result = self._executor(list(command), timeout_seconds=int(timeout_seconds))
            code = result.exit_code
            entry: dict[str, Any] = {
                "step_id": step_id,
                "attempt": attempt,
                "command": list(command),
                "action_class": action_class,
                "require_approval": bool(require_approval),
                "exit_code": code,
                "stdout_excerpt": result.stdout[:_OUTPUT_EXCERPT_CHARS],
                "stderr_excerpt": result.stderr[:_OUTPUT_EXCERPT_CHARS],
            }
            if code == ExitCode.OK:
                entry["outcome"] = "success"
                record = journal.record_attempt(entry)
                journal.mark_step_complete(step_id)
                return record
            if code in retry_codes and attempt <= max_retries:
                entry["outcome"] = "retry-scheduled"
                journal.record_attempt(entry)
                delay = min(self._backoff_base * (2 ** (attempt - 1)), _MAX_BACKOFF_SECONDS)
                self._sleeper(delay)
                continue
            return self._terminal(entry, code, on_gate_failure)

    def _terminal(
        self, entry: dict[str, Any], code: int, on_gate_failure: str
    ) -> dict[str, Any]:
        journal = self._journal
        step_id = str(entry["step_id"])
        if code == ExitCode.APPROVAL_REQUIRED:
            entry["outcome"] = "approval-required"
            record = journal.record_attempt(entry)
            journal.halt(
                "paused",
                detail=f"step {step_id!r} requires approval (exit 3)",
                advice="approve the pending decision, then `gauntlet workflow resume`",
            )
            return record
        if code == ExitCode.GATE_FAILED:
            if on_gate_failure == "continue":
                entry["outcome"] = "gate-failed-continue"
                record = journal.record_attempt(entry)
                # Recorded as done-with-failure so a resume never re-runs it.
                journal.mark_step_complete(step_id)
                return record
            entry["outcome"] = "gate-failed"
            record = journal.record_attempt(entry)
            journal.halt(
                "failed",
                detail=f"step {step_id!r} failed a gate (exit 4)",
                advice="inspect the gate evidence; repair via `gauntlet workflow heal`",
            )
            return record
        if code == ExitCode.INCONCLUSIVE:
            entry["outcome"] = "inconclusive"
            record = journal.record_attempt(entry)
            journal.halt(
                "inconclusive",
                detail=f"step {step_id!r} was inconclusive (exit 5)",
                advice="evidence is insufficient either way; never promote this run",
            )
            return record
        if code == ExitCode.CONFLICT:
            entry["outcome"] = "conflict"
            record = journal.record_attempt(entry)
            journal.halt(
                "conflict",
                detail=f"step {step_id!r} hit a conflict (exit 6)",
                advice="re-fork from the current baseline and retry the experiment",
            )
            return record
        if code == ExitCode.OUTCOME_UNKNOWN:
            entry["outcome"] = "outcome-unknown"
            record = journal.record_attempt(entry)
            journal.halt(
                "outcome-unknown",
                detail=f"step {step_id!r} has an unknown external outcome (exit 7)",
                advice=(
                    "reconcile the external effect with `gauntlet intent reconcile` "
                    "before anything else; this step is never retried automatically"
                ),
            )
            return record
        if code in (ExitCode.INVALID, ExitCode.SECURITY_VIOLATION):
            entry["outcome"] = "fatal"
            record = journal.record_attempt(entry)
            journal.halt(
                "failed",
                detail=f"step {step_id!r} failed fatally (exit {code})",
                advice="fix the invocation or security violation; no automatic repair",
            )
            return record
        if code == ExitCode.DEPENDENCY_UNAVAILABLE:
            entry["outcome"] = "dependency-unavailable"
            record = journal.record_attempt(entry)
            journal.halt(
                "failed",
                detail=f"step {step_id!r} exhausted retries on exit 8",
                advice="install the dependency or raise max_retries via `gauntlet workflow heal`",
            )
            return record
        entry["outcome"] = "failed"
        record = journal.record_attempt(entry)
        journal.halt("failed", detail=f"step {step_id!r} failed with exit code {code}")
        return record


@dataclass(frozen=True)
class RunReport:
    """Outcome of one ``run``/``resume`` invocation, journal-backed."""

    workflow_name: str
    status: RunStatus
    journal_path: Path
    completed_steps: tuple[str, ...]
    pending_request_ids: tuple[str, ...]
    attempt_count: int
    status_detail: str | None = None
    advice: str | None = None


@dataclass
class WorkflowRunner:
    """Executes generated workflow YAML through MAF with durable state.

    Per-workflow layout under ``checkpoints_root`` (normally
    ``ProjectPaths.workflow_checkpoints_dir``)::

        <root>/<workflow_name>/checkpoints/*.json   MAF checkpoints
        <root>/<workflow_name>/journal.json         redacted attempt journal
    """

    checkpoints_root: Path
    executor: StepExecutor
    clock: Clock = field(default_factory=SystemClock)
    sleeper: Sleeper = _default_sleep
    redactor: Redactor = field(default_factory=Redactor)
    intent_verifier: IntentVerifier | None = None
    backoff_base_seconds: float = 0.5

    def workflow_dir(self, workflow_name: str) -> Path:
        return self.checkpoints_root / workflow_name

    def journal_path(self, workflow_name: str) -> Path:
        return self.workflow_dir(workflow_name) / "journal.json"

    def load_journal(self, workflow_name: str, plan_digest: str) -> RunJournal | None:
        return RunJournal.load(
            self.journal_path(workflow_name),
            workflow_name=workflow_name,
            plan_digest=plan_digest,
            clock=self.clock,
            redactor=self.redactor,
        )

    def run(
        self,
        plan: WorkflowPlanV1,
        yaml_text: str,
        plan_digest: str,
        *,
        inputs: Mapping[str, str] | None = None,
    ) -> RunReport:
        return asyncio.run(self.run_async(plan, yaml_text, plan_digest, inputs=inputs))

    def resume(self, plan: WorkflowPlanV1, yaml_text: str, plan_digest: str) -> RunReport:
        return asyncio.run(self.resume_async(plan, yaml_text, plan_digest))

    async def run_async(
        self,
        plan: WorkflowPlanV1,
        yaml_text: str,
        plan_digest: str,
        *,
        inputs: Mapping[str, str] | None = None,
    ) -> RunReport:
        """Start a fresh run: prior checkpoints and journal are superseded."""
        self._reset_run_state(plan.workflow_name)
        journal = RunJournal(
            self.journal_path(plan.workflow_name),
            workflow_name=plan.workflow_name,
            plan_digest=plan_digest,
            clock=self.clock,
            redactor=self.redactor,
        )
        journal.flush()
        workflow, _storage = self._build(plan, yaml_text, journal)
        result = await workflow.run(dict(inputs if inputs is not None else plan.inputs))
        return self._finalize(journal, result)

    async def resume_async(
        self, plan: WorkflowPlanV1, yaml_text: str, plan_digest: str
    ) -> RunReport:
        """Continue a paused run; see the module docstring for both paths."""
        journal = self.load_journal(plan.workflow_name, plan_digest)
        if journal is None:
            raise InvalidInvocationError(
                f"no resumable run journal for workflow {plan.workflow_name!r}",
                hint="start the workflow with `gauntlet workflow run` first",
            )
        if journal.status != "paused":
            raise InvalidInvocationError(
                f"workflow {plan.workflow_name!r} is {journal.status}, not paused",
                hint="only paused runs can be resumed",
            )
        journal.set_status("running", detail="resuming")
        workflow, storage = self._build(plan, yaml_text, journal)
        pending = None
        if storage is not None:
            checkpoints = await storage.list_checkpoints(workflow_name=plan.workflow_name)
            with_pending = [cp for cp in checkpoints if cp.pending_request_info_events]
            if with_pending:
                pending = max(with_pending, key=lambda cp: cp.timestamp)
        if pending is not None:
            # Path 1: true MAF checkpoint resume at a RequestExternalInput gate.
            responses = {
                request_id: ExternalInputResponse(user_input="approved")
                for request_id in pending.pending_request_info_events
            }
            result = await workflow.run(
                checkpoint_id=pending.checkpoint_id, responses=responses
            )
        else:
            # Path 2: journal replay; completed steps short-circuit inside
            # gauntlet_step, so each remaining step runs exactly once.
            result = await workflow.run(dict(plan.inputs))
        return self._finalize(journal, result)

    def _reset_run_state(self, workflow_name: str) -> None:
        checkpoints_dir = self.workflow_dir(workflow_name) / "checkpoints"
        if checkpoints_dir.is_dir():
            for stale in checkpoints_dir.glob("*.json"):
                stale.unlink()
        journal_file = self.journal_path(workflow_name)
        if journal_file.is_file():
            journal_file.unlink()

    def _build(
        self, plan: WorkflowPlanV1, yaml_text: str, journal: RunJournal
    ) -> tuple[Any, FileCheckpointStorage | None]:
        storage: FileCheckpointStorage | None = None
        if plan.checkpoint:
            checkpoints_dir = self.workflow_dir(plan.workflow_name) / "checkpoints"
            checkpoints_dir.mkdir(parents=True, exist_ok=True)
            storage = FileCheckpointStorage(
                checkpoints_dir, allowed_checkpoint_types=list(CHECKPOINT_ALLOWED_TYPES)
            )
        session = StepSession(
            journal,
            self.executor,
            sleeper=self.sleeper,
            intent_verifier=self.intent_verifier,
            backoff_base_seconds=self.backoff_base_seconds,
        )

        def gauntlet_step(
            step_id: str,
            command: list[str],
            action_class: str = "R0",
            require_approval: bool = False,
            max_retries: int = 0,
            retry_on_exit_codes: list[int] | None = None,
            on_gate_failure: str = "end",
            timeout_seconds: int = 600,
        ) -> dict[str, Any]:
            return session.invoke(
                step_id=step_id,
                command=command,
                action_class=action_class,
                require_approval=require_approval,
                max_retries=max_retries,
                retry_on_exit_codes=retry_on_exit_codes,
                on_gate_failure=on_gate_failure,
                timeout_seconds=timeout_seconds,
            )

        factory = WorkflowFactory(checkpoint_storage=storage)
        factory.register_tool("gauntlet_step", gauntlet_step)
        workflow = factory.create_workflow_from_yaml(yaml_text)
        return workflow, storage

    def _finalize(self, journal: RunJournal, result: Any) -> RunReport:
        pending_events = list(result.get_request_info_events())
        # A StepSession terminal status always wins over the MAF run state.
        if not journal.halted:
            if pending_events:
                journal.set_pending_requests([event.request_id for event in pending_events])
                journal.halt(
                    "paused",
                    detail="waiting for external approval input",
                    advice="approve with `gauntlet workflow resume`",
                )
            else:
                journal.set_pending_requests([])
                journal.set_status("completed")
        return RunReport(
            workflow_name=journal.workflow_name,
            status=journal.status,
            journal_path=journal.path,
            completed_steps=tuple(journal.completed_steps),
            pending_request_ids=tuple(journal.pending_request_ids),
            attempt_count=len(journal.attempts),
            status_detail=journal.status_detail,
            advice=journal.advice,
        )
