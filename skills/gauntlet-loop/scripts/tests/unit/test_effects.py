"""Executor safety rules, command adapter containment, and saga settlement."""

from __future__ import annotations

from collections.abc import Iterator, MutableMapping
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from gauntlet.canonical_json import digest_bytes, digest_value
from gauntlet.constants import EffectClass, IntentState
from gauntlet.effects import (
    CommandEffectAdapter,
    DeterministicFakeAdapter,
    EffectPolicy,
    Executor,
    Saga,
    SagaStep,
    default_effect_policy,
)
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
    EffectPlanV1,
    EffectResultV1,
)
from gauntlet.support import CompletedProcess, FrozenClock, SequentialIdGenerator
from tests.factories import (
    POLICY_DIGEST,
    FailingPreconditions,
    NoFailedPreconditions,
    RecordingEmitter,
    make_intent,
    seed_intent_state,
)


@pytest.fixture()
def ledger(tmp_path: Path) -> LedgerStore:
    return LedgerStore(tmp_path / "ledger")


@pytest.fixture()
def emitter() -> RecordingEmitter:
    return RecordingEmitter()


@pytest.fixture()
def intents(ledger: LedgerStore, clock: FrozenClock, emitter: RecordingEmitter) -> IntentService:
    return IntentService(ledger, clock=clock, emitter=emitter)


def _executor(
    intents: IntentService,
    ledger: LedgerStore,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    *,
    preconditions: object | None = None,
    policy: EffectPolicy | None = None,
) -> Executor:
    return Executor(
        intents,
        ledger,
        clock=clock,
        ids=ids,
        preconditions=preconditions or NoFailedPreconditions(),  # type: ignore[arg-type]
        effect_policy=policy,
    )


def _committed_intent(
    ledger: LedgerStore,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    **kwargs: Any,
) -> ActionIntentV1:
    intent = make_intent(ids, clock, **kwargs)
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    return intent


def _fake(
    clock: FrozenClock, ids: SequentialIdGenerator, outcomes: list[str], **kwargs: Any
) -> DeterministicFakeAdapter:
    return DeterministicFakeAdapter(clock=clock, ids=ids, outcomes=outcomes, **kwargs)


# ---------------------------------------------------------------------------
# Executor refusal rules
# ---------------------------------------------------------------------------


def test_executor_refuses_uncommitted_intents(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    for state in (IntentState.PROPOSED, IntentState.VOTING, IntentState.EXECUTING):
        intent = make_intent(ids, clock)
        seed_intent_state(ledger, intent, state)
        adapter = _fake(clock, ids, ["completed"])
        with pytest.raises(GateFailedError, match="executor refuses"):
            executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
        assert adapter.execute_calls == []


def test_executor_refuses_stale_policy_digest(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    adapter = _fake(clock, ids, ["completed"])
    with pytest.raises(GateFailedError, match="policy digest changed"):
        executor.execute(
            intent.intent_id,
            adapter,
            current_policy_digest=digest_value({"policy": "rotated"}),
        )
    assert adapter.execute_calls == []
    assert intents.current(intent.intent_id).state is IntentState.COMMITTED


def test_executor_rechecks_preconditions_and_aborts(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(
        intents, ledger, clock, ids, preconditions=FailingPreconditions(["worktree is dirty"])
    )
    intent = _committed_intent(ledger, ids, clock)
    adapter = _fake(clock, ids, ["completed"])
    with pytest.raises(GateFailedError, match="preconditions no longer hold"):
        executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert adapter.execute_calls == []
    assert intents.current(intent.intent_id).state is IntentState.ABORTED


def test_executor_rejects_missing_idempotency_key(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(
        ledger, ids, clock, effect_class=EffectClass.IDEMPOTENT_KNOWN_OUTCOME
    )
    with pytest.raises(InvalidInvocationError, match="idempotency key"):
        executor.execute(
            intent.intent_id, _fake(clock, ids, ["completed"]), current_policy_digest=POLICY_DIGEST
        )


def test_executor_rejects_missing_reconciliation_strategy(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    for effect_class in (EffectClass.IRREVERSIBLE_GATED, EffectClass.UNKNOWN):
        intent = _committed_intent(ledger, ids, clock, effect_class=effect_class)
        with pytest.raises(InvalidInvocationError, match="reconciliation strategy"):
            executor.execute(
                intent.intent_id,
                _fake(clock, ids, ["completed"]),
                current_policy_digest=POLICY_DIGEST,
            )


def test_valid_contracts_execute(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(
        ledger,
        ids,
        clock,
        effect_class=EffectClass.IDEMPOTENT_KNOWN_OUTCOME,
        idempotency_key="idem-1",
    )
    result = executor.execute(
        intent.intent_id, _fake(clock, ids, ["completed"]), current_policy_digest=POLICY_DIGEST
    )
    assert result.outcome == "completed"
    assert intents.current(intent.intent_id).state is IntentState.COMPLETED


# ---------------------------------------------------------------------------
# No effect before durable commit (ordering proof)
# ---------------------------------------------------------------------------


class OrderRecordingAdapter(DeterministicFakeAdapter):
    """Records the exact ledger contents at the moment execute() runs."""

    def __init__(self, ledger: LedgerStore, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._order_ledger = ledger
        self.ledger_ids_at_execute: list[str] = []

    def execute(self, plan: EffectPlanV1) -> EffectResultV1:
        self.ledger_ids_at_execute = self._order_ledger.list_ids("decisions")
        return super().execute(plan)


def test_no_effect_before_durable_commit(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    adapter = OrderRecordingAdapter(ledger, clock=clock, ids=ids, outcomes=["completed"])
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    committed_record = f"{intent.intent_id}.state.0000.committed"
    executing_record = f"{intent.intent_id}.state.0001.executing"
    assert committed_record in adapter.ledger_ids_at_execute
    assert executing_record in adapter.ledger_ids_at_execute


# ---------------------------------------------------------------------------
# Retry table and unknown-outcome rules
# ---------------------------------------------------------------------------


def test_pure_retries_unknown_up_to_table_then_succeeds(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.PURE)
    adapter = _fake(clock, ids, ["outcome_unknown", "outcome_unknown", "completed"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "completed"
    assert len(adapter.execute_calls) == 3


def test_pure_retry_budget_is_bounded(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.PURE)
    adapter = _fake(clock, ids, ["outcome_unknown"] * 4)
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "outcome_unknown"
    assert len(adapter.execute_calls) == 3  # 1 attempt + 2 retries from the table
    assert intents.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN


def test_idempotent_retries_failed_before_effect_once(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(
        ledger,
        ids,
        clock,
        effect_class=EffectClass.IDEMPOTENT_KNOWN_OUTCOME,
        idempotency_key="idem-1",
    )
    adapter = _fake(clock, ids, ["failed_before_effect", "completed"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "completed"
    assert len(adapter.execute_calls) == 2


def test_non_idempotent_never_retries_after_unknown_even_if_table_allows(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    # A hostile/buggy retry table cannot override the structural rule.
    policy = EffectPolicy(automatic_retry={EffectClass.REVERSIBLE: 5})
    executor = _executor(intents, ledger, clock, ids, policy=policy)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.REVERSIBLE)
    adapter = _fake(clock, ids, ["outcome_unknown", "completed"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "outcome_unknown"
    assert len(adapter.execute_calls) == 1
    assert intents.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN


def test_adapter_crash_becomes_unknown_never_retried_for_non_idempotent(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.REVERSIBLE)
    adapter = _fake(clock, ids, ["raise", "completed"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "outcome_unknown"
    assert "scripted adapter crash" in (result.error or "")
    assert len(adapter.execute_calls) == 1


def test_failed_after_effect_is_never_auto_retried(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.PURE)
    adapter = _fake(clock, ids, ["failed_after_effect", "completed"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "failed_after_effect"
    assert len(adapter.execute_calls) == 1
    assert intents.current(intent.intent_id).state is IntentState.FAILED_AFTER_EFFECT


def test_default_effect_policy_matches_the_brief_table() -> None:
    policy = default_effect_policy()
    assert policy.automatic_retry[EffectClass.PURE] == 2
    assert policy.automatic_retry[EffectClass.READ_ONLY] == 2
    assert policy.automatic_retry[EffectClass.IDEMPOTENT_KNOWN_OUTCOME] == 1
    for effect_class in (
        EffectClass.BUFFERABLE,
        EffectClass.REVERSIBLE,
        EffectClass.REVERSIBLE_WITH_COST,
        EffectClass.IRREVERSIBLE_GATED,
        EffectClass.UNKNOWN,
    ):
        assert policy.automatic_retry[effect_class] == 0
    assert policy.require_idempotency_key_for == {EffectClass.IDEMPOTENT_KNOWN_OUTCOME}
    assert policy.network_default == "deny"
    assert policy.never_assume_failure is True
    assert policy.never_retry_non_idempotent is True


# ---------------------------------------------------------------------------
# Version recording, prepare failures, results
# ---------------------------------------------------------------------------


def test_adapter_version_is_recorded_on_every_result(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    adapter = _fake(clock, ids, ["completed"])
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    results = executor.results_for(intent.intent_id)
    assert results and all(r.adapter_version == adapter.version for r in results)


class _NoVersionAdapter:
    """Returns results without adapter_version and has no version attribute."""

    def __init__(self, clock: FrozenClock, ids: SequentialIdGenerator) -> None:
        self._clock = clock
        self._ids = ids

    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1:
        return EffectPlanV1(
            plan_id=self._ids.new_id("plan"), intent_id=intent.intent_id, adapter="no-version"
        )

    def execute(self, plan: EffectPlanV1) -> EffectResultV1:
        return EffectResultV1(
            result_id=self._ids.new_id("result"),
            plan_id=plan.plan_id,
            intent_id=plan.intent_id,
            outcome="completed",
            started_at=self._clock.now(),
        )

    def compensate(self, result: EffectResultV1) -> EffectResultV1:
        return result

    def reconcile(self, intent: ActionIntentV1) -> Any:
        raise NotImplementedError


def test_missing_adapter_version_is_stamped_unversioned(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    adapter = _NoVersionAdapter(clock, ids)
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "completed"
    assert result.adapter_version == "unversioned"


class _PrepareFailsAdapter(DeterministicFakeAdapter):
    def prepare(self, intent: ActionIntentV1) -> EffectPlanV1:
        raise RuntimeError("cannot build the plan; token=xoxb-1234567890abcdef")


def test_prepare_failure_settles_failed_before_effect_and_redacts(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    adapter = _PrepareFailsAdapter(clock=clock, ids=ids, outcomes=[])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert result.outcome == "failed_before_effect"
    assert "xoxb" not in (result.error or "")
    assert "[REDACTED]" in (result.error or "")
    assert intents.current(intent.intent_id).state is IntentState.FAILED_BEFORE_EFFECT
    assert adapter.execute_calls == []


# ---------------------------------------------------------------------------
# Compensation and reconciliation
# ---------------------------------------------------------------------------


def _settled_unknown_intent(
    executor: Executor,
    intents: IntentService,
    ledger: LedgerStore,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
) -> ActionIntentV1:
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.REVERSIBLE)
    adapter = _fake(clock, ids, ["outcome_unknown"])
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    return intent


def test_compensation_is_recorded_and_settles_compensated(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock, effect_class=EffectClass.REVERSIBLE)
    adapter = _fake(clock, ids, ["failed_after_effect"])
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    compensation = executor.compensate(intent.intent_id, adapter)
    assert compensation.outcome == "completed"
    assert adapter.compensate_calls[0].outcome == "failed_after_effect"
    assert intents.current(intent.intent_id).state is IntentState.COMPENSATED
    assert any(
        rid.startswith(f"{intent.intent_id}.compensation.") for rid in ledger.list_ids("decisions")
    )


def test_failed_compensation_settles_compensation_failed(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _settled_unknown_intent(executor, intents, ledger, clock, ids)
    adapter = _fake(clock, ids, [], compensation_outcome="failed_after_effect")
    executor.compensate(intent.intent_id, adapter)
    assert intents.current(intent.intent_id).state is IntentState.COMPENSATION_FAILED


def test_compensation_requires_a_compensatable_state(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    with pytest.raises(InvalidInvocationError, match="compensation applies"):
        executor.compensate(intent.intent_id, _fake(clock, ids, []))


def test_compensation_requires_a_recorded_result(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, IntentState.FAILED_AFTER_EFFECT)
    with pytest.raises(InvalidInvocationError, match="no effect result"):
        executor.compensate(intent.intent_id, _fake(clock, ids, []))


def test_reconciliation_is_recorded_and_settles_reconciled(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _settled_unknown_intent(executor, intents, ledger, clock, ids)
    adapter = _fake(clock, ids, [], reconcile_resolution="confirmed_completed")
    record = executor.reconcile(intent.intent_id, adapter)
    assert record.resolution == "confirmed_completed"
    assert intents.current(intent.intent_id).state is IntentState.RECONCILED
    assert any(
        rid.startswith(f"{intent.intent_id}.reconciliation.")
        for rid in ledger.list_ids("decisions")
    )


def test_still_unknown_reconciliation_never_assumes_failure(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _settled_unknown_intent(executor, intents, ledger, clock, ids)
    adapter = _fake(clock, ids, [], reconcile_resolution="still_unknown")
    record = executor.reconcile(intent.intent_id, adapter)
    assert record.resolution == "still_unknown"
    assert intents.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN


def test_reconcile_requires_outcome_unknown(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    executor = _executor(intents, ledger, clock, ids)
    intent = _committed_intent(ledger, ids, clock)
    with pytest.raises(InvalidInvocationError, match="reconciliation applies"):
        executor.reconcile(intent.intent_id, _fake(clock, ids, []))


# ---------------------------------------------------------------------------
# CommandEffectAdapter
# ---------------------------------------------------------------------------


class FakeRunner:
    def __init__(self, script: list[CompletedProcess | Exception]) -> None:
        self._script = script
        self.calls: list[dict[str, Any]] = []

    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess:
        self.calls.append(
            {
                "argv": argv,
                "cwd": cwd,
                "env": env,
                "timeout_seconds": timeout_seconds,
                "max_output_bytes": max_output_bytes,
            }
        )
        item = self._script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class ListBlobSink:
    def __init__(self) -> None:
        self.blobs: list[bytes] = []

    def store(self, data: bytes) -> str:
        self.blobs.append(data)
        return digest_bytes(data)


def _command_adapter(
    runner: FakeRunner,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    tmp_path: Path,
    **kwargs: Any,
) -> CommandEffectAdapter:
    worktree = tmp_path / "worktree"
    worktree.mkdir(exist_ok=True)
    defaults: dict[str, Any] = {
        "argv": ["echo", "hello"],
        "cwd": worktree,
        "allowed_roots": [worktree],
        "environment": {
            "PATH": "/usr/bin",
            "KEEP": "plain-value",
            "API_TOKEN": "xoxb-secret1234567890",
        },
        "environment_allowlist": ["KEEP", "API_TOKEN", "NOT_SET_ANYWHERE"],
        "timeout_seconds": 42,
        "max_output_bytes": 2048,
    }
    defaults.update(kwargs)
    return CommandEffectAdapter(runner, clock=clock, ids=ids, **defaults)


def _ok_process(stdout: str = "out", stderr: str = "") -> CompletedProcess:
    return CompletedProcess(argv=("echo", "hello"), exit_code=0, stdout=stdout, stderr=stderr)


def test_command_adapter_requires_argv(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    with pytest.raises(InvalidInvocationError, match="non-empty argv"):
        _command_adapter(FakeRunner([]), clock, ids, tmp_path, argv=[])


def test_command_adapter_rejects_cwd_outside_declared_roots(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    adapter = _command_adapter(FakeRunner([]), clock, ids, tmp_path, cwd=tmp_path / "elsewhere")
    with pytest.raises(SecurityViolationError, match="outside the declared"):
        adapter.prepare(make_intent(ids, clock))


def test_command_adapter_plan_declares_all_limits(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    adapter = _command_adapter(FakeRunner([]), clock, ids, tmp_path)
    plan = adapter.prepare(make_intent(ids, clock))
    assert plan.adapter == "command"
    assert plan.network == "deny"
    assert plan.timeout_seconds == 42
    assert plan.max_output_bytes == 2048
    assert plan.staging_paths == [str((tmp_path / "worktree").resolve())]


def test_command_adapter_scrubs_and_redacts_environment(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner([_ok_process()])
    adapter = _command_adapter(runner, clock, ids, tmp_path)
    plan = adapter.prepare(make_intent(ids, clock))
    adapter.execute(plan)
    env = runner.calls[0]["env"]
    # PATH is not allowlisted; an allowlisted-but-unset variable is absent.
    assert set(env) == {"KEEP", "API_TOKEN"}
    assert env["KEEP"] == "plain-value"
    assert env["API_TOKEN"] == "[REDACTED]"
    assert runner.calls[0]["timeout_seconds"] == 42
    assert runner.calls[0]["max_output_bytes"] == 2048
    assert runner.calls[0]["cwd"] == (tmp_path / "worktree").resolve()


def test_command_adapter_persists_output_digests_and_blobs(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    sink = ListBlobSink()
    runner = FakeRunner([_ok_process(stdout="visible xoxb-secret1234567890", stderr="err")])
    adapter = _command_adapter(runner, clock, ids, tmp_path, blob_sink=sink)
    plan = adapter.prepare(make_intent(ids, clock))
    result = adapter.execute(plan)
    assert result.outcome == "completed"
    assert result.exit_code == 0
    assert result.adapter_version == adapter.version
    redacted_stdout = b"visible [REDACTED]"
    assert result.stdout_digest == digest_bytes(redacted_stdout)
    assert redacted_stdout in sink.blobs
    assert b"err" in sink.blobs


def test_command_adapter_maps_nonzero_exit_to_failed_after_effect(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner([CompletedProcess(argv=("echo",), exit_code=3, stdout="", stderr="boom")])
    adapter = _command_adapter(runner, clock, ids, tmp_path)
    result = adapter.execute(adapter.prepare(make_intent(ids, clock)))
    assert result.outcome == "failed_after_effect"
    assert result.exit_code == 3


def test_command_adapter_maps_timeout_to_outcome_unknown(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner(
        [CompletedProcess(argv=("echo",), exit_code=-1, stdout="", stderr="", timed_out=True)]
    )
    adapter = _command_adapter(runner, clock, ids, tmp_path)
    result = adapter.execute(adapter.prepare(make_intent(ids, clock)))
    assert result.outcome == "outcome_unknown"
    assert result.exit_code is None
    assert result.error == "command timed out"
    assert result.settled_at is None


def test_command_adapter_maps_missing_executable_to_failed_before_effect(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner([InvalidInvocationError("executable not found: 'nope'")])
    adapter = _command_adapter(runner, clock, ids, tmp_path)
    result = adapter.execute(adapter.prepare(make_intent(ids, clock)))
    assert result.outcome == "failed_before_effect"
    assert "executable not found" in (result.error or "")


def test_command_adapter_compensation(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner([_ok_process(), _ok_process()])
    adapter = _command_adapter(runner, clock, ids, tmp_path, compensation_argv=["undo", "--force"])
    plan = adapter.prepare(make_intent(ids, clock))
    result = adapter.execute(plan)
    compensation = adapter.compensate(result)
    assert compensation.outcome == "completed"
    assert runner.calls[1]["argv"] == ["undo", "--force"]


def test_command_adapter_without_compensation_refuses(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    runner = FakeRunner([_ok_process()])
    adapter = _command_adapter(runner, clock, ids, tmp_path)
    plan = adapter.prepare(make_intent(ids, clock))
    result = adapter.execute(plan)
    with pytest.raises(InvalidInvocationError, match="no compensation command"):
        adapter.compensate(result)


class _Probe:
    def probe(self, intent: ActionIntentV1) -> tuple[str, dict[str, Any]]:
        return "confirmed_completed", {"external_id": "reg-42"}


def test_command_adapter_reconcile_with_and_without_probe(
    clock: FrozenClock, ids: SequentialIdGenerator, tmp_path: Path
) -> None:
    intent = make_intent(ids, clock)
    bare = _command_adapter(FakeRunner([]), clock, ids, tmp_path)
    record = bare.reconcile(intent)
    assert record.resolution == "still_unknown"
    assert record.method == "manual-review-required"
    probed = _command_adapter(FakeRunner([]), clock, ids, tmp_path, probe=_Probe())
    record = probed.reconcile(intent)
    assert record.resolution == "confirmed_completed"
    assert record.external_state == {"external_id": "reg-42"}


# ---------------------------------------------------------------------------
# Saga (happy path and failure handling; crash boundaries live in
# scripts/tests/adversarial/test_write_ahead.py)
# ---------------------------------------------------------------------------


class CountingLock:
    def __init__(self) -> None:
        self.acquisitions = 0

    @contextmanager
    def __call__(self) -> Iterator[None]:
        self.acquisitions += 1
        yield


def _saga(
    ledger: LedgerStore,
    clock: FrozenClock,
    steps: list[SagaStep],
    **kwargs: Any,
) -> Saga:
    return Saga(
        ledger,
        clock=clock,
        saga_id=kwargs.pop("saga_id", "saga:test-1"),
        plan={"kind": "test-settlement"},
        steps=steps,
        **kwargs,
    )


def test_saga_happy_path_journals_every_boundary_in_order(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    lock = CountingLock()
    staged: list[str] = []
    calls: list[str] = []

    def settle(name: str) -> dict[str, Any]:
        calls.append(name)
        return {name: True}

    saga = _saga(
        ledger,
        clock,
        [
            SagaStep("graph", EffectClass.REVERSIBLE, lambda ctx: settle("graph")),
            SagaStep("git", EffectClass.REVERSIBLE, lambda ctx: settle("git")),
        ],
        lock=lock,
        stage=lambda: staged.append("staged"),
        preconditions=lambda: [],
        commit=lambda: calls.append("commit"),
    )
    context = saga.run({"seed": 1})
    assert context == {"seed": 1, "graph": True, "git": True}
    assert lock.acquisitions == 1
    assert staged == ["staged"]
    assert calls == ["commit", "graph", "git"]
    boundaries = [entry.boundary for entry in saga.entries()]
    assert boundaries == [
        "plan-frozen",
        "lock-acquired",
        "staged",
        "preconditions-ok",
        "intent-committed",
        "step:graph",
        "step:graph",
        "step:git",
        "step:git",
        "saga-completed",
    ]
    assert saga.entries()[0].plan_digest == digest_value({"kind": "test-settlement"})


def test_saga_precondition_failure_stops_before_commit(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    saga = _saga(
        ledger,
        clock,
        [SagaStep("noop", EffectClass.PURE, lambda ctx: None)],
        preconditions=lambda: ["baseline moved"],
    )
    with pytest.raises(GateFailedError, match="preconditions failed"):
        saga.run()
    boundaries = [entry.boundary for entry in saga.entries()]
    assert "preconditions-failed" in boundaries
    assert "intent-committed" not in boundaries


def test_saga_failure_compensates_completed_reversible_steps_in_reverse(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    undone: list[str] = []

    def fail(ctx: MutableMapping[str, Any]) -> None:
        raise RuntimeError("registry rejected the artifact")

    saga = _saga(
        ledger,
        clock,
        [
            SagaStep(
                "one",
                EffectClass.REVERSIBLE,
                lambda ctx: None,
                compensation=lambda ctx: undone.append("one"),
            ),
            SagaStep(
                "two",
                EffectClass.REVERSIBLE,
                lambda ctx: None,
                compensation=lambda ctx: undone.append("two"),
            ),
            SagaStep("three", EffectClass.IRREVERSIBLE_GATED, fail),
        ],
    )
    with pytest.raises(GateFailedError, match="saga step three failed"):
        saga.run()
    assert undone == ["two", "one"]
    entries = saga.entries()
    statuses = [(e.boundary, e.status) for e in entries]
    assert ("compensation:two", "compensated") in statuses
    assert ("compensation:one", "compensated") in statuses
    assert ("saga-failed", None) in statuses


def test_saga_unknown_outcome_marks_reconciliation_without_compensation(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    undone: list[str] = []

    def unknown(ctx: MutableMapping[str, Any]) -> None:
        raise OutcomeUnknownError("push may or may not have landed")

    saga = _saga(
        ledger,
        clock,
        [
            SagaStep(
                "one",
                EffectClass.REVERSIBLE,
                lambda ctx: None,
                compensation=lambda ctx: undone.append("one"),
            ),
            SagaStep("push", EffectClass.IRREVERSIBLE_GATED, unknown),
        ],
    )
    with pytest.raises(OutcomeUnknownError):
        saga.run()
    assert undone == []  # never compensate around an uncertain outcome
    boundaries = [entry.boundary for entry in saga.entries()]
    assert "saga-needs-reconciliation" in boundaries


def test_saga_compensation_failure_is_journaled_not_raised(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    def bad_compensation(ctx: MutableMapping[str, Any]) -> None:
        raise RuntimeError("compensation broke")

    def fail(ctx: MutableMapping[str, Any]) -> None:
        raise RuntimeError("later step failed")

    saga = _saga(
        ledger,
        clock,
        [
            SagaStep(
                "one", EffectClass.REVERSIBLE, lambda ctx: None, compensation=bad_compensation
            ),
            SagaStep("two", EffectClass.REVERSIBLE, fail),
        ],
    )
    with pytest.raises(GateFailedError, match="saga step two failed"):
        saga.run()
    statuses = [(e.boundary, e.status) for e in saga.entries()]
    assert ("compensation:one", "compensation_failed") in statuses


def test_saga_recover_reports_already_completed(ledger: LedgerStore, clock: FrozenClock) -> None:
    saga = _saga(ledger, clock, [SagaStep("noop", EffectClass.PURE, lambda ctx: None)])
    saga.run()
    recovery = saga.recover()
    assert recovery.status == "already-completed"
