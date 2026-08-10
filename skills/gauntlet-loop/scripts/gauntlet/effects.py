"""The effect executor: the ONLY component allowed to invoke effect adapters.

Safety rules enforced here (each is tested):

- an intent must be durably ``committed`` before any adapter executes;
- preconditions are rechecked immediately before execution;
- a stale intent (policy/spec digest changed) is rejected;
- effect classes that require an idempotency key or reconciliation strategy
  are rejected without one;
- no automatic retry after ``outcome_unknown`` for a non-idempotent operation,
  and the retry table from the effect policy bounds every other retry;
- the exact adapter/tool version is recorded on every result;
- unknown outcomes are never assumed to be failures — they reconcile.

Network denial in :class:`CommandEffectAdapter` is policy-level (allowlisted
environment, argv-array execution, deny-by-default plan flag); it is NOT
kernel-level sandboxing. Do not treat it as an isolation boundary.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, MutableMapping, Sequence
from contextlib import AbstractContextManager, nullcontext
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated, Any, Literal, Protocol

from pydantic import Field

from gauntlet.canonical_json import digest_bytes, digest_value
from gauntlet.constants import EffectClass, IntentState
from gauntlet.errors import (
    GateFailedError,
    InvalidInvocationError,
    OutcomeUnknownError,
    SecurityViolationError,
)
from gauntlet.intents import IntentService
from gauntlet.ledger import LedgerStore
from gauntlet.models import (
    ActionIntentV1,
    Digest,
    EffectPlanV1,
    EffectResultV1,
    GauntletModel,
    NonEmptyStr,
    ReconciliationRecordV1,
    StableId,
    UtcTimestamp,
)
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, IdGenerator, ProcessRunner

LEDGER_KIND = "decisions"

# Classes whose repeated execution cannot duplicate a durable external effect.
IDEMPOTENT_EFFECT_CLASSES = frozenset(
    {EffectClass.PURE, EffectClass.READ_ONLY, EffectClass.IDEMPOTENT_KNOWN_OUTCOME}
)


# ---------------------------------------------------------------------------
# Protocols (real implementations are wired by the coordinator)
# ---------------------------------------------------------------------------


class EffectAdapter(Protocol):
    """The narrow adapter contract from the execution brief."""

    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1: ...

    def execute(self, plan: EffectPlanV1) -> EffectResultV1: ...

    def compensate(self, result: EffectResultV1) -> EffectResultV1: ...

    def reconcile(self, intent: ActionIntentV1) -> ReconciliationRecordV1: ...


class BlobSink(Protocol):
    """Persists observational output blobs; returns the sha256:<hex> digest."""

    def store(self, data: bytes) -> str: ...


class PreconditionChecker(Protocol):
    """Rechecks intent preconditions immediately before execution."""

    def failed_preconditions(self, intent: ActionIntentV1) -> list[str]: ...


class ReconciliationProbe(Protocol):
    """Queries external state via an idempotency key or external identifier."""

    def probe(
        self, intent: ActionIntentV1
    ) -> tuple[
        Literal["confirmed_completed", "confirmed_absent", "still_unknown"], dict[str, Any]
    ]: ...


# ---------------------------------------------------------------------------
# Effect policy
# ---------------------------------------------------------------------------

_DEFAULT_AUTOMATIC_RETRY: dict[EffectClass, int] = {
    EffectClass.PURE: 2,
    EffectClass.READ_ONLY: 2,
    EffectClass.IDEMPOTENT_KNOWN_OUTCOME: 1,
    EffectClass.BUFFERABLE: 0,
    EffectClass.REVERSIBLE: 0,
    EffectClass.REVERSIBLE_WITH_COST: 0,
    EffectClass.IRREVERSIBLE_GATED: 0,
    EffectClass.UNKNOWN: 0,
}


@dataclass(frozen=True)
class EffectPolicy:
    """Validated dev.gauntlet.effect-policy/v1 defaults.

    ``require_reconciliation_strategy_for`` is our conservative default for
    classes whose unknown outcomes must reconcile rather than fail.
    """

    schema_version: str = "dev.gauntlet.effect-policy/v1"
    default_effect_class: EffectClass = EffectClass.UNKNOWN
    network_default: Literal["deny", "allow"] = "deny"
    automatic_retry: Mapping[EffectClass, int] = field(
        default_factory=lambda: dict(_DEFAULT_AUTOMATIC_RETRY)
    )
    require_idempotency_key_for: frozenset[EffectClass] = frozenset(
        {EffectClass.IDEMPOTENT_KNOWN_OUTCOME}
    )
    require_reconciliation_strategy_for: frozenset[EffectClass] = frozenset(
        {EffectClass.IRREVERSIBLE_GATED, EffectClass.UNKNOWN}
    )
    never_assume_failure: Literal[True] = True
    never_retry_non_idempotent: Literal[True] = True


def default_effect_policy() -> EffectPolicy:
    return EffectPolicy()


# ---------------------------------------------------------------------------
# Executor
# ---------------------------------------------------------------------------


class Executor:
    """Drives committed intents through executing to a terminal outcome."""

    def __init__(
        self,
        intents: IntentService,
        ledger: LedgerStore,
        *,
        clock: Clock,
        ids: IdGenerator,
        preconditions: PreconditionChecker,
        effect_policy: EffectPolicy | None = None,
        redactor: Redactor | None = None,
    ) -> None:
        self._intents = intents
        self._ledger = ledger
        self._clock = clock
        self._ids = ids
        self._preconditions = preconditions
        self._policy = effect_policy or default_effect_policy()
        self._redactor = redactor or Redactor()

    # -- record helpers ------------------------------------------------------

    def _record_ids(self, prefix: str) -> list[str]:
        return sorted(rid for rid in self._ledger.list_ids(LEDGER_KIND) if rid.startswith(prefix))

    def _append_result(self, intent_id: str, result: EffectResultV1, kind: str) -> EffectResultV1:
        prefix = f"{intent_id}.{kind}."
        seq = len(self._record_ids(prefix))
        self._ledger.append(LEDGER_KIND, f"{prefix}{seq:04d}", result)
        return result

    def results_for(self, intent_id: str) -> list[EffectResultV1]:
        return [
            self._ledger.load(LEDGER_KIND, rid, EffectResultV1)
            for rid in self._record_ids(f"{intent_id}.effect.")
        ]

    def _redact(self, text: str) -> str:
        redacted, _ = self._redactor.redact_text(text)
        return redacted

    # -- validation gates ----------------------------------------------------

    def _validate_contracts(self, intent: ActionIntentV1) -> None:
        if (
            intent.effect_class in self._policy.require_idempotency_key_for
            and intent.idempotency_key is None
        ):
            raise InvalidInvocationError(
                f"effect class {intent.effect_class.value!r} requires an idempotency key",
                hint="declare intent.idempotency_key before committing the intent",
            )
        if (
            intent.effect_class in self._policy.require_reconciliation_strategy_for
            and intent.reconciliation_strategy is None
        ):
            raise InvalidInvocationError(
                f"effect class {intent.effect_class.value!r} requires a reconciliation strategy",
                hint="declare intent.reconciliation_strategy before committing the intent",
            )

    # -- execution -----------------------------------------------------------

    def execute(
        self,
        intent_id: str,
        adapter: EffectAdapter,
        *,
        current_policy_digest: str,
        current_spec_digest: str | None = None,
    ) -> EffectResultV1:
        """Run the effect for a committed intent under all safety rules."""
        intent = self._intents.current(intent_id)
        if intent.state is not IntentState.COMMITTED:
            raise GateFailedError(
                f"executor refuses intent {intent_id} in state {intent.state.value!r}",
                hint="only durably committed intents may execute",
            )
        self._validate_contracts(intent)
        failed = self._preconditions.failed_preconditions(intent)
        if failed:
            self._intents.abort(intent_id, reason=f"preconditions no longer hold: {failed}")
            raise GateFailedError(
                f"preconditions no longer hold for {intent_id}: {'; '.join(failed)}"
            )
        # Freshness is checked inside mark_executing; a stale intent never
        # reaches the adapter. The durable executing record precedes execute().
        self._intents.mark_executing(
            intent_id,
            current_policy_digest=current_policy_digest,
            current_spec_digest=current_spec_digest,
        )
        try:
            plan = adapter.prepare(intent)
        except Exception as error:
            result = self._synthesize_result(
                intent, plan_id=None, outcome="failed_before_effect", error=error, adapter=adapter
            )
            self._append_result(intent_id, result, "effect")
            self._intents.settle(intent_id, IntentState.FAILED_BEFORE_EFFECT)
            return result
        self._ledger.append(LEDGER_KIND, f"{intent_id}.plan.{plan.plan_id.split(':')[-1]}", plan)
        result = self._execute_with_retries(intent, plan, adapter)
        self._intents.settle(intent_id, IntentState(result.outcome))
        return result

    def _execute_with_retries(
        self, intent: ActionIntentV1, plan: EffectPlanV1, adapter: EffectAdapter
    ) -> EffectResultV1:
        retries_allowed = self._policy.automatic_retry.get(intent.effect_class, 0)
        attempt = 0
        while True:
            attempt += 1
            try:
                result = adapter.execute(plan)
            except Exception as error:  # crash mid-effect: outcome is unknown
                result = self._synthesize_result(
                    intent,
                    plan_id=plan.plan_id,
                    outcome="outcome_unknown",
                    error=error,
                    adapter=adapter,
                )
            result = self._stamp_version(result, adapter)
            self._append_result(intent.intent_id, result, "effect")
            if result.outcome in ("completed", "failed_after_effect"):
                return result
            if (
                result.outcome == "outcome_unknown"
                and intent.effect_class not in IDEMPOTENT_EFFECT_CLASSES
            ):
                # Structural rule: never auto-retry an unknown non-idempotent
                # outcome, regardless of what any retry table says.
                return result
            if attempt > retries_allowed:
                return result

    def _stamp_version(self, result: EffectResultV1, adapter: EffectAdapter) -> EffectResultV1:
        if result.adapter_version is None:
            version = str(getattr(adapter, "version", "unversioned"))
            return result.model_copy(update={"adapter_version": version})
        return result

    def _synthesize_result(
        self,
        intent: ActionIntentV1,
        *,
        plan_id: str | None,
        outcome: Literal["failed_before_effect", "outcome_unknown"],
        error: Exception,
        adapter: EffectAdapter,
    ) -> EffectResultV1:
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=plan_id or self._ids.new_id("plan"),
            intent_id=intent.intent_id,
            outcome=outcome,
            adapter_version=str(getattr(adapter, "version", "unversioned")),
            started_at=self._clock.now(),
            error=self._redact(f"{type(error).__name__}: {error}"),
        )

    # -- compensation and reconciliation --------------------------------------

    def compensate(self, intent_id: str, adapter: EffectAdapter) -> EffectResultV1:
        intent = self._intents.current(intent_id)
        if intent.state not in (IntentState.FAILED_AFTER_EFFECT, IntentState.OUTCOME_UNKNOWN):
            raise InvalidInvocationError(
                f"compensation applies to failed_after_effect or outcome_unknown intents, "
                f"not {intent.state.value!r}"
            )
        results = self.results_for(intent_id)
        if not results:
            raise InvalidInvocationError(f"no effect result recorded for {intent_id}")
        compensation = adapter.compensate(results[-1])
        compensation = self._stamp_version(compensation, adapter)
        self._append_result(intent_id, compensation, "compensation")
        terminal = (
            IntentState.COMPENSATED
            if compensation.outcome == "completed"
            else IntentState.COMPENSATION_FAILED
        )
        self._intents.settle(intent_id, terminal)
        return compensation

    def reconcile(self, intent_id: str, adapter: EffectAdapter) -> ReconciliationRecordV1:
        """Query external truth; never assume failure while still unknown."""
        intent = self._intents.current(intent_id)
        if intent.state is not IntentState.OUTCOME_UNKNOWN:
            raise InvalidInvocationError(
                f"reconciliation applies to outcome_unknown intents, not {intent.state.value!r}"
            )
        record = adapter.reconcile(intent)
        prefix = f"{intent_id}.reconciliation."
        seq = len(self._record_ids(prefix))
        self._ledger.append(LEDGER_KIND, f"{prefix}{seq:04d}", record)
        if record.resolution != "still_unknown":
            self._intents.settle(intent_id, IntentState.RECONCILED)
        return record


# ---------------------------------------------------------------------------
# Command adapter
# ---------------------------------------------------------------------------


class CommandEffectAdapter:
    """Executes one declared argv array under strict, policy-level containment.

    - argv arrays only (the injected ProcessRunner never uses ``shell=True``);
    - cwd must resolve inside one of the declared worktree/staging roots;
    - only allowlisted environment variables pass, values pass through the
      redactor first;
    - timeout and output caps are explicit on every plan;
    - ``network="deny"`` is policy-level documentation and environment
      scrubbing, NOT kernel-level sandboxing;
    - stdout/stderr are persisted as observational digests (blobs go to the
      injected BlobSink when provided).
    """

    def __init__(
        self,
        runner: ProcessRunner,
        *,
        clock: Clock,
        ids: IdGenerator,
        argv: Sequence[str],
        cwd: Path,
        allowed_roots: Sequence[Path],
        environment: Mapping[str, str],
        environment_allowlist: Sequence[str] = (),
        timeout_seconds: int = 600,
        max_output_bytes: int = 10_485_760,
        network: Literal["deny", "allow"] = "deny",
        redactor: Redactor | None = None,
        blob_sink: BlobSink | None = None,
        version: str = "command-effect-adapter/0.1.0",
        compensation_argv: Sequence[str] | None = None,
        probe: ReconciliationProbe | None = None,
    ) -> None:
        if not argv:
            raise InvalidInvocationError("command adapter requires a non-empty argv array")
        self._runner = runner
        self._clock = clock
        self._ids = ids
        self._argv = list(argv)
        self._cwd = cwd
        self._allowed_roots = [root.resolve() for root in allowed_roots]
        self._environment = environment
        self._allowlist = list(environment_allowlist)
        self._timeout_seconds = timeout_seconds
        self._max_output_bytes = max_output_bytes
        self._network = network
        self._redactor = redactor or Redactor()
        self._blob_sink = blob_sink
        self.version = version
        self._compensation_argv = list(compensation_argv) if compensation_argv else None
        self._probe = probe

    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1:
        resolved = self._cwd.resolve()
        if not any(
            resolved == root or resolved.is_relative_to(root) for root in self._allowed_roots
        ):
            raise SecurityViolationError(
                f"cwd {resolved} is outside the declared worktree/staging roots"
            )
        return EffectPlanV1(
            plan_id=self._ids.new_id("plan"),
            intent_id=intent.intent_id,
            adapter="command",
            argv=self._argv,
            cwd=str(resolved),
            environment_allowlist=self._allowlist,
            network=self._network,
            timeout_seconds=self._timeout_seconds,
            max_output_bytes=self._max_output_bytes,
            staging_paths=[str(root) for root in self._allowed_roots],
            preconditions_checked_at=self._clock.now(),
        )

    def _scrubbed_env(self, allowlist: Sequence[str]) -> dict[str, str]:
        env: dict[str, str] = {}
        for key in allowlist:
            if key in self._environment:
                redacted, _ = self._redactor.redact_text(self._environment[key])
                env[key] = redacted
        return env

    def _capture(self, text: str) -> str:
        redacted, _ = self._redactor.redact_text(text)
        data = redacted.encode("utf-8")
        if self._blob_sink is not None:
            self._blob_sink.store(data)
        return digest_bytes(data)

    def _run_argv(self, argv: list[str], plan: EffectPlanV1, intent_id: str) -> EffectResultV1:
        started = self._clock.now()
        try:
            completed = self._runner.run(
                argv,
                cwd=Path(plan.cwd) if plan.cwd is not None else None,
                env=self._scrubbed_env(plan.environment_allowlist),
                timeout_seconds=plan.timeout_seconds,
                max_output_bytes=plan.max_output_bytes,
            )
        except InvalidInvocationError as error:
            return EffectResultV1(
                result_id=self._ids.new_id("result"),
                plan_id=plan.plan_id,
                intent_id=intent_id,
                outcome="failed_before_effect",
                adapter_version=self.version,
                started_at=started,
                error=error.message,
            )
        if completed.timed_out:
            outcome: Literal["completed", "failed_after_effect", "outcome_unknown"] = (
                "outcome_unknown"
            )
        elif completed.exit_code == 0:
            outcome = "completed"
        else:
            outcome = "failed_after_effect"
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=plan.plan_id,
            intent_id=intent_id,
            outcome=outcome,
            exit_code=None if completed.timed_out else completed.exit_code,
            stdout_digest=self._capture(completed.stdout),
            stderr_digest=self._capture(completed.stderr),
            adapter_version=self.version,
            started_at=started,
            settled_at=None if completed.timed_out else self._clock.now(),
            error="command timed out" if completed.timed_out else None,
        )

    def execute(self, plan: EffectPlanV1) -> EffectResultV1:
        return self._run_argv(list(plan.argv), plan, plan.intent_id)

    def compensate(self, result: EffectResultV1) -> EffectResultV1:
        if self._compensation_argv is None:
            raise InvalidInvocationError(
                "no compensation command declared for this adapter",
                hint="pass compensation_argv when constructing the CommandEffectAdapter",
            )
        plan = EffectPlanV1(
            plan_id=self._ids.new_id("plan"),
            intent_id=result.intent_id,
            adapter="command",
            argv=self._compensation_argv,
            cwd=str(self._cwd.resolve()),
            environment_allowlist=self._allowlist,
            network=self._network,
            timeout_seconds=self._timeout_seconds,
            max_output_bytes=self._max_output_bytes,
        )
        return self._run_argv(self._compensation_argv, plan, result.intent_id)

    def reconcile(self, intent: ActionIntentV1) -> ReconciliationRecordV1:
        if self._probe is None:
            return ReconciliationRecordV1(
                reconciliation_id=self._ids.new_id("reconciliation"),
                intent_id=intent.intent_id,
                method="manual-review-required",
                resolution="still_unknown",
                resolved_at=self._clock.now(),
                notes="no reconciliation probe configured; external truth unqueried",
            )
        resolution, external_state = self._probe.probe(intent)
        return ReconciliationRecordV1(
            reconciliation_id=self._ids.new_id("reconciliation"),
            intent_id=intent.intent_id,
            method="probe",
            external_state=external_state,
            resolution=resolution,
            resolved_at=self._clock.now(),
        )


# ---------------------------------------------------------------------------
# Settlement saga
# ---------------------------------------------------------------------------


class SagaJournalEntryV1(GauntletModel):
    """One durable journal entry per settlement boundary."""

    schema_version: Literal["dev.gauntlet.saga-journal/v1"] = "dev.gauntlet.saga-journal/v1"
    entry_id: StableId
    saga_id: StableId
    seq: Annotated[int, Field(ge=0)]
    boundary: NonEmptyStr
    step_id: str | None = None
    status: (
        Literal["started", "completed", "failed", "unknown", "compensated", "compensation_failed"]
        | None
    ) = None
    detail: str | None = None
    plan_digest: Digest | None = None
    recorded_at: UtcTimestamp


@dataclass
class SagaStep:
    """A typed settlement step; promote/release reuse the same shape."""

    step_id: str
    effect_class: EffectClass
    action: Callable[[MutableMapping[str, Any]], dict[str, Any] | None]
    # The compensation return value is ignored; only the journal matters.
    compensation: Callable[[MutableMapping[str, Any]], object] | None = None


@dataclass(frozen=True)
class SagaRecovery:
    status: Literal[
        "already-completed", "not-committed", "needs-reconciliation", "failed", "resumed-completed"
    ]
    resumed_steps: tuple[str, ...] = ()
    uncertain_steps: tuple[str, ...] = ()


class Saga:
    """Generic multi-store settlement with a durable journal at each boundary.

    Order (per the brief): validate/freeze plan -> lock -> stage -> recheck
    preconditions -> commit intent -> settle each store in recorded order ->
    append outcomes -> compensate reversible completed steps on later failure
    -> mark uncertain outcomes for reconciliation.
    """

    def __init__(
        self,
        ledger: LedgerStore,
        *,
        clock: Clock,
        saga_id: str,
        plan: Any,
        steps: Sequence[SagaStep],
        lock: Callable[[], AbstractContextManager[None]] | None = None,
        stage: Callable[[], None] | None = None,
        preconditions: Callable[[], list[str]] | None = None,
        commit: Callable[[], None] | None = None,
        redactor: Redactor | None = None,
    ) -> None:
        self._ledger = ledger
        self._clock = clock
        self._saga_id = saga_id
        self._plan = plan
        self._steps = list(steps)
        self._lock = lock
        self._stage = stage
        self._preconditions = preconditions
        self._commit = commit
        self._redactor = redactor or Redactor()

    # -- journal --------------------------------------------------------------

    def _entry_ids(self) -> list[str]:
        prefix = f"{self._saga_id}."
        return sorted(rid for rid in self._ledger.list_ids(LEDGER_KIND) if rid.startswith(prefix))

    def entries(self) -> list[SagaJournalEntryV1]:
        return [
            self._ledger.load(LEDGER_KIND, rid, SagaJournalEntryV1) for rid in self._entry_ids()
        ]

    def _journal(
        self,
        boundary: str,
        *,
        step_id: str | None = None,
        status: Literal[
            "started", "completed", "failed", "unknown", "compensated", "compensation_failed"
        ]
        | None = None,
        detail: str | None = None,
        plan_digest: str | None = None,
    ) -> None:
        seq = len(self._entry_ids())
        redacted_detail = None
        if detail is not None:
            redacted_detail, _ = self._redactor.redact_text(detail)
        entry = SagaJournalEntryV1(
            entry_id=f"{self._saga_id}.{seq:04d}",
            saga_id=self._saga_id,
            seq=seq,
            boundary=boundary,
            step_id=step_id,
            status=status,
            detail=redacted_detail,
            plan_digest=plan_digest,
            recorded_at=self._clock.now(),
        )
        self._ledger.append(LEDGER_KIND, entry.entry_id, entry)

    # -- run -------------------------------------------------------------------

    def run(self, context: MutableMapping[str, Any] | None = None) -> dict[str, Any]:
        ctx: dict[str, Any] = dict(context or {})
        self._journal("plan-frozen", plan_digest=digest_value(self._plan))
        lock_cm = self._lock() if self._lock is not None else nullcontext()
        with lock_cm:
            self._journal("lock-acquired")
            if self._stage is not None:
                self._stage()
            self._journal("staged")
            failures = self._preconditions() if self._preconditions is not None else []
            if failures:
                self._journal("preconditions-failed", detail="; ".join(failures))
                raise GateFailedError(
                    f"saga {self._saga_id} preconditions failed: {'; '.join(failures)}"
                )
            self._journal("preconditions-ok")
            if self._commit is not None:
                self._commit()
            self._journal("intent-committed")
            self._settle_steps(self._steps, ctx, completed_before=[])
            self._journal("saga-completed")
        return ctx

    def _settle_steps(
        self,
        steps: Sequence[SagaStep],
        ctx: dict[str, Any],
        *,
        completed_before: list[SagaStep],
    ) -> None:
        completed = list(completed_before)
        for step in steps:
            self._journal(f"step:{step.step_id}", step_id=step.step_id, status="started")
            try:
                outputs = step.action(ctx)
            except OutcomeUnknownError as error:
                self._journal(
                    f"step:{step.step_id}",
                    step_id=step.step_id,
                    status="unknown",
                    detail=error.message,
                )
                self._journal("saga-needs-reconciliation", step_id=step.step_id)
                raise
            except Exception as error:
                self._journal(
                    f"step:{step.step_id}",
                    step_id=step.step_id,
                    status="failed",
                    detail=f"{type(error).__name__}: {error}",
                )
                self._compensate_completed(completed, ctx)
                self._journal("saga-failed", step_id=step.step_id)
                raise GateFailedError(f"saga step {step.step_id} failed: {error}") from error
            if outputs:
                ctx.update(outputs)
            self._journal(f"step:{step.step_id}", step_id=step.step_id, status="completed")
            completed.append(step)

    def _compensate_completed(self, completed: list[SagaStep], ctx: dict[str, Any]) -> None:
        for step in reversed(completed):
            if step.compensation is None:
                continue
            try:
                step.compensation(ctx)
            except Exception as error:
                self._journal(
                    f"compensation:{step.step_id}",
                    step_id=step.step_id,
                    status="compensation_failed",
                    detail=f"{type(error).__name__}: {error}",
                )
                continue
            self._journal(
                f"compensation:{step.step_id}", step_id=step.step_id, status="compensated"
            )

    # -- crash recovery ----------------------------------------------------------

    def recover(self, context: MutableMapping[str, Any] | None = None) -> SagaRecovery:
        """Resume or reconcile after a crash.

        Never duplicates a non-idempotent effect and never assumes an unknown
        outcome failed: a step journaled ``started`` without a terminal entry
        is re-run only when its effect class is idempotent; otherwise it is
        marked uncertain for reconciliation.
        """
        entries = self.entries()
        boundaries = {entry.boundary for entry in entries}
        if "saga-completed" in boundaries:
            return SagaRecovery(status="already-completed")
        if "intent-committed" not in boundaries:
            self._journal(
                "recovery-abandoned",
                detail="crash before intent commitment; no settlement effect can exist",
            )
            return SagaRecovery(status="not-committed")
        last_status: dict[str, str] = {}
        for entry in entries:
            if entry.step_id is not None and entry.status is not None:
                last_status[entry.step_id] = entry.status
        if any(status == "failed" for status in last_status.values()):
            return SagaRecovery(status="failed")
        ctx: dict[str, Any] = dict(context or {})
        resumed: list[str] = []
        uncertain: list[str] = []
        lock_cm = self._lock() if self._lock is not None else nullcontext()
        with lock_cm:
            for step in self._steps:
                status = last_status.get(step.step_id)
                if status == "completed":
                    continue
                if status == "unknown" or (
                    status == "started" and step.effect_class not in IDEMPOTENT_EFFECT_CLASSES
                ):
                    if status != "unknown":
                        self._journal(
                            f"step:{step.step_id}",
                            step_id=step.step_id,
                            status="unknown",
                            detail="crash during a non-idempotent step; outcome is unknown",
                        )
                    uncertain.append(step.step_id)
                    continue
                if uncertain:
                    # Later stores must not settle past an uncertain boundary.
                    continue
                self._journal(
                    f"recovery-rerun:{step.step_id}", step_id=step.step_id, status="started"
                )
                self._settle_steps([step], ctx, completed_before=[])
                resumed.append(step.step_id)
            if uncertain:
                self._journal("saga-needs-reconciliation", detail=", ".join(uncertain))
                return SagaRecovery(
                    status="needs-reconciliation",
                    resumed_steps=tuple(resumed),
                    uncertain_steps=tuple(uncertain),
                )
            self._journal("saga-completed")
        return SagaRecovery(status="resumed-completed", resumed_steps=tuple(resumed))


# ---------------------------------------------------------------------------
# Deterministic fakes for tests
# ---------------------------------------------------------------------------


class DeterministicFakeAdapter:
    """Scripted adapter: each execute() consumes the next scripted outcome.

    The scripted token ``"raise"`` makes execute() raise, simulating a crash
    with an unknown external outcome.
    """

    def __init__(
        self,
        *,
        clock: Clock,
        ids: IdGenerator,
        outcomes: Sequence[str],
        compensation_outcome: str = "completed",
        reconcile_resolution: Literal[
            "confirmed_completed", "confirmed_absent", "still_unknown"
        ] = "confirmed_completed",
    ) -> None:
        self._clock = clock
        self._ids = ids
        self._outcomes = list(outcomes)
        self._compensation_outcome = compensation_outcome
        self._reconcile_resolution = reconcile_resolution
        self.version = "deterministic-fake/1.0.0"
        self.prepare_calls: list[ActionIntentV1] = []
        self.execute_calls: list[EffectPlanV1] = []
        self.compensate_calls: list[EffectResultV1] = []
        self.reconcile_calls: list[ActionIntentV1] = []

    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1:
        self.prepare_calls.append(intent)
        return EffectPlanV1(
            plan_id=self._ids.new_id("plan"),
            intent_id=intent.intent_id,
            adapter="deterministic-fake",
            timeout_seconds=intent.timeout_seconds,
        )

    def execute(self, plan: EffectPlanV1) -> EffectResultV1:
        self.execute_calls.append(plan)
        outcome = self._outcomes.pop(0)
        if outcome == "raise":
            raise RuntimeError("scripted adapter crash")
        assert outcome in (
            "completed",
            "failed_before_effect",
            "failed_after_effect",
            "outcome_unknown",
        )
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=plan.plan_id,
            intent_id=plan.intent_id,
            outcome=outcome,  # type: ignore[arg-type]
            exit_code=0 if outcome == "completed" else 1,
            adapter_version=self.version,
            started_at=self._clock.now(),
        )

    def compensate(self, result: EffectResultV1) -> EffectResultV1:
        self.compensate_calls.append(result)
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=result.plan_id,
            intent_id=result.intent_id,
            outcome=self._compensation_outcome,  # type: ignore[arg-type]
            adapter_version=self.version,
            started_at=self._clock.now(),
        )

    def reconcile(self, intent: ActionIntentV1) -> ReconciliationRecordV1:
        self.reconcile_calls.append(intent)
        return ReconciliationRecordV1(
            reconciliation_id=self._ids.new_id("reconciliation"),
            intent_id=intent.intent_id,
            method="scripted",
            resolution=self._reconcile_resolution,
            resolved_at=self._clock.now(),
        )


class ExternalCrashFakeAdapter:
    """Succeeds externally but crashes before local persistence.

    ``execute`` lands a fake external id in ``external_system`` (simulating a
    remote registry) and then raises, so the local outcome is unknown.
    ``reconcile`` queries the same external system via the idempotency key and
    confirms completion with the external id.
    """

    def __init__(self, *, clock: Clock, ids: IdGenerator) -> None:
        self._clock = clock
        self._ids = ids
        self.version = "external-crash-fake/1.0.0"
        self.external_system: dict[str, str] = {}

    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1:
        return EffectPlanV1(
            plan_id=self._ids.new_id("plan"),
            intent_id=intent.intent_id,
            adapter="external-crash-fake",
        )

    def execute(self, plan: EffectPlanV1) -> EffectResultV1:
        external_id = f"ext-{len(self.external_system) + 1}"
        self.external_system[plan.intent_id] = external_id
        raise RuntimeError("process crashed before persisting the local result")

    def compensate(self, result: EffectResultV1) -> EffectResultV1:
        self.external_system.pop(result.intent_id, None)
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=result.plan_id,
            intent_id=result.intent_id,
            outcome="completed",
            adapter_version=self.version,
            started_at=self._clock.now(),
        )

    def reconcile(self, intent: ActionIntentV1) -> ReconciliationRecordV1:
        external_id = self.external_system.get(intent.intent_id)
        if external_id is not None:
            return ReconciliationRecordV1(
                reconciliation_id=self._ids.new_id("reconciliation"),
                intent_id=intent.intent_id,
                method="external-id-lookup",
                external_state={"external_id": external_id},
                resolution="confirmed_completed",
                resolved_at=self._clock.now(),
            )
        return ReconciliationRecordV1(
            reconciliation_id=self._ids.new_id("reconciliation"),
            intent_id=intent.intent_id,
            method="external-id-lookup",
            resolution="confirmed_absent",
            resolved_at=self._clock.now(),
        )
