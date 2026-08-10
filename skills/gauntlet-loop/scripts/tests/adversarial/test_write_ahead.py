"""Fault injection at every settlement boundary; recovery per the brief.

Crashes are simulated two ways:

- ``KeyboardInterrupt`` raised from injected callables (it is a
  ``BaseException``, so no handler in the saga can journal a terminal entry —
  exactly like a killed process);
- rebuilding services over the same ledger directory, proving recovery works
  purely from durable records.
"""

from __future__ import annotations

from collections.abc import MutableMapping
from pathlib import Path
from typing import Any

import pytest

from gauntlet.constants import EffectClass, IntentState
from gauntlet.effects import (
    DeterministicFakeAdapter,
    Executor,
    ExternalCrashFakeAdapter,
    Saga,
    SagaJournalEntryV1,
    SagaStep,
)
from gauntlet.errors import GateFailedError
from gauntlet.intents import IntentService
from gauntlet.ledger import LedgerStore
from gauntlet.support import FrozenClock, SequentialIdGenerator
from tests.factories import (
    POLICY_DIGEST,
    NoFailedPreconditions,
    RecordingEmitter,
    make_intent,
    seed_intent_state,
)

SAGA_ID = "saga:promo-1"


@pytest.fixture()
def ledger(tmp_path: Path) -> LedgerStore:
    return LedgerStore(tmp_path / "ledger")


def _service(ledger: LedgerStore, clock: FrozenClock) -> IntentService:
    """A fresh service over the same ledger simulates a restarted process."""
    return IntentService(ledger, clock=clock, emitter=RecordingEmitter())


def _executor(
    intents: IntentService, ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> Executor:
    return Executor(intents, ledger, clock=clock, ids=ids, preconditions=NoFailedPreconditions())


# ---------------------------------------------------------------------------
# Intent/executor crash boundaries
# ---------------------------------------------------------------------------


def test_crash_after_intent_persistence_before_decision(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    service = _service(ledger, clock)
    intent = make_intent(ids, clock)
    service.propose(intent)
    # -- crash: the process dies before any vote or decision --
    restarted = _service(ledger, clock)
    recovered = restarted.current(intent.intent_id)
    assert recovered.state is IntentState.PROPOSED
    # No effect or decision record exists; the intent can resume voting.
    assert not [r for r in ledger.list_ids("decisions") if ".effect." in r]
    restarted.begin_voting(intent.intent_id)
    assert restarted.current(intent.intent_id).state is IntentState.VOTING


def test_crash_after_commit_before_effect_start(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    # -- crash: committed durably, executor never started --
    restarted = _service(ledger, clock)
    executor = _executor(restarted, ledger, clock, ids)
    assert executor.results_for(intent.intent_id) == []
    adapter = DeterministicFakeAdapter(clock=clock, ids=ids, outcomes=["completed"])
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    # The effect ran exactly once after recovery; no duplication.
    assert len(adapter.execute_calls) == 1
    assert restarted.current(intent.intent_id).state is IntentState.COMPLETED


def test_crash_during_effect_execution_is_unknown_not_failed(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(ids, clock, effect_class=EffectClass.REVERSIBLE)
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    service = _service(ledger, clock)
    executor = _executor(service, ledger, clock, ids)
    adapter = DeterministicFakeAdapter(clock=clock, ids=ids, outcomes=["raise"])
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    # Never assume failure: the state is outcome_unknown, not failed.
    assert result.outcome == "outcome_unknown"
    assert service.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN
    assert len(adapter.execute_calls) == 1  # and never auto-retried


def test_crash_after_external_success_before_local_persistence(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(
        ids,
        clock,
        effect_class=EffectClass.IRREVERSIBLE_GATED,
        idempotency_key="release-key-1",
        reconciliation_strategy="external-id-lookup",
    )
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    service = _service(ledger, clock)
    executor = _executor(service, ledger, clock, ids)
    adapter = ExternalCrashFakeAdapter(clock=clock, ids=ids)
    result = executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    # The external system holds exactly one effect; locally we know nothing.
    assert result.outcome == "outcome_unknown"
    assert list(adapter.external_system.values()) == ["ext-1"]
    assert service.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN

    # -- restart: recovery must never re-execute the non-idempotent effect --
    restarted = _service(ledger, clock)
    restarted_executor = _executor(restarted, ledger, clock, ids)
    with pytest.raises(GateFailedError, match="executor refuses"):
        restarted_executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert list(adapter.external_system.values()) == ["ext-1"]  # still exactly one

    # Reconciliation resolves through the fake external ID.
    record = restarted_executor.reconcile(intent.intent_id, adapter)
    assert record.resolution == "confirmed_completed"
    assert record.external_state == {"external_id": "ext-1"}
    assert restarted.current(intent.intent_id).state is IntentState.RECONCILED


def test_unknown_external_effect_can_be_compensated_then_confirmed_absent(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(
        ids,
        clock,
        effect_class=EffectClass.IRREVERSIBLE_GATED,
        reconciliation_strategy="external-id-lookup",
    )
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    service = _service(ledger, clock)
    executor = _executor(service, ledger, clock, ids)
    adapter = ExternalCrashFakeAdapter(clock=clock, ids=ids)
    executor.execute(intent.intent_id, adapter, current_policy_digest=POLICY_DIGEST)
    assert service.current(intent.intent_id).state is IntentState.OUTCOME_UNKNOWN
    # Authorized compensation withdraws the external effect...
    compensation = executor.compensate(intent.intent_id, adapter)
    assert compensation.outcome == "completed"
    assert adapter.external_system == {}
    assert service.current(intent.intent_id).state is IntentState.COMPENSATED
    # ...and a later reconciliation probe confirms the external absence.
    record = adapter.reconcile(intent)
    assert record.resolution == "confirmed_absent"


class _CompensationCrashes(DeterministicFakeAdapter):
    def compensate(self, result: Any) -> Any:
        raise KeyboardInterrupt


def test_crash_during_compensation_leaves_intent_compensatable(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(ids, clock, effect_class=EffectClass.REVERSIBLE)
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    service = _service(ledger, clock)
    executor = _executor(service, ledger, clock, ids)
    crashing = _CompensationCrashes(clock=clock, ids=ids, outcomes=["failed_after_effect"])
    executor.execute(intent.intent_id, crashing, current_policy_digest=POLICY_DIGEST)
    with pytest.raises(KeyboardInterrupt):
        executor.compensate(intent.intent_id, crashing)
    # The crash left no partial terminal state: compensation can be retried.
    restarted = _service(ledger, clock)
    restarted_executor = _executor(restarted, ledger, clock, ids)
    assert restarted.current(intent.intent_id).state is IntentState.FAILED_AFTER_EFFECT
    working = DeterministicFakeAdapter(clock=clock, ids=ids, outcomes=[])
    restarted_executor.compensate(intent.intent_id, working)
    assert restarted.current(intent.intent_id).state is IntentState.COMPENSATED


# ---------------------------------------------------------------------------
# Saga crash boundaries
# ---------------------------------------------------------------------------


def _steps(counters: dict[str, int]) -> list[SagaStep]:
    def bump(name: str) -> dict[str, Any]:
        counters[name] = counters.get(name, 0) + 1
        return {name: counters[name]}

    return [
        SagaStep("checks", EffectClass.PURE, lambda ctx: bump("checks")),
        SagaStep(
            "graph-promote",
            EffectClass.REVERSIBLE,
            lambda ctx: bump("graph-promote"),
            compensation=lambda ctx: bump("undo-graph-promote"),
        ),
        SagaStep("git-push", EffectClass.IRREVERSIBLE_GATED, lambda ctx: bump("git-push")),
        SagaStep("record-decision", EffectClass.PURE, lambda ctx: bump("record-decision")),
    ]


def _saga(
    ledger: LedgerStore,
    clock: FrozenClock,
    steps: list[SagaStep],
    **kwargs: Any,
) -> Saga:
    return Saga(
        ledger,
        clock=clock,
        saga_id=SAGA_ID,
        plan={"promotion": "candidate-1"},
        steps=steps,
        **kwargs,
    )


def _seed_journal(ledger: LedgerStore, clock: FrozenClock, entries: list[dict[str, Any]]) -> None:
    """Reproduce the exact durable journal a crashed process left behind."""
    for seq, spec in enumerate(entries):
        entry = SagaJournalEntryV1(
            entry_id=f"{SAGA_ID}.{seq:04d}",
            saga_id=SAGA_ID,
            seq=seq,
            recorded_at=clock.now(),
            **spec,
        )
        ledger.append("decisions", entry.entry_id, entry)


_PRELUDE = [
    {"boundary": "plan-frozen"},
    {"boundary": "lock-acquired"},
    {"boundary": "staged"},
    {"boundary": "preconditions-ok"},
]


def _boundaries(saga: Saga) -> list[str]:
    return [entry.boundary for entry in saga.entries()]


def test_crash_before_lock_recovers_as_not_committed(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}

    def crash_lock() -> Any:
        raise KeyboardInterrupt

    saga = _saga(ledger, clock, _steps(counters), lock=crash_lock)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    assert _boundaries(saga) == ["plan-frozen"]
    recovery = _saga(ledger, clock, _steps(counters)).recover()
    assert recovery.status == "not-committed"
    assert counters == {}  # nothing ever executed


def test_crash_during_staging_recovers_as_not_committed(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}

    def crash_stage() -> None:
        raise KeyboardInterrupt

    saga = _saga(ledger, clock, _steps(counters), stage=crash_stage)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    assert _boundaries(saga)[-1] == "lock-acquired"
    assert _saga(ledger, clock, _steps(counters)).recover().status == "not-committed"


def test_crash_during_preconditions_recovers_as_not_committed(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}

    def crash_preconditions() -> list[str]:
        raise KeyboardInterrupt

    saga = _saga(ledger, clock, _steps(counters), preconditions=crash_preconditions)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    assert _boundaries(saga)[-1] == "staged"
    assert _saga(ledger, clock, _steps(counters)).recover().status == "not-committed"


def test_crash_during_intent_commit_recovers_as_not_committed(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}

    def crash_commit() -> None:
        raise KeyboardInterrupt

    saga = _saga(ledger, clock, _steps(counters), commit=crash_commit)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    assert _boundaries(saga)[-1] == "preconditions-ok"
    recovery = _saga(ledger, clock, _steps(counters)).recover()
    # Without a durable intent-committed boundary no effect can exist, so
    # recovery abandons rather than resuming.
    assert recovery.status == "not-committed"
    assert counters == {}


def test_crash_after_commit_before_first_step_resumes_all_steps(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    _seed_journal(ledger, clock, [*_PRELUDE, {"boundary": "intent-committed"}])
    counters: dict[str, int] = {}
    recovery = _saga(ledger, clock, _steps(counters)).recover()
    assert recovery.status == "resumed-completed"
    assert recovery.resumed_steps == ("checks", "graph-promote", "git-push", "record-decision")
    # Every settlement ran exactly once.
    assert counters == {
        "checks": 1,
        "graph-promote": 1,
        "git-push": 1,
        "record-decision": 1,
    }


def test_crash_during_idempotent_step_is_rerun_safely(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    _seed_journal(
        ledger,
        clock,
        [
            *_PRELUDE,
            {"boundary": "intent-committed"},
            {"boundary": "step:checks", "step_id": "checks", "status": "started"},
        ],
    )
    counters: dict[str, int] = {}
    recovery = _saga(ledger, clock, _steps(counters)).recover()
    assert recovery.status == "resumed-completed"
    assert counters["checks"] == 1  # re-run of the idempotent step, once
    assert counters["git-push"] == 1


def test_crash_during_non_idempotent_step_never_duplicates_and_never_assumes_failure(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    _seed_journal(
        ledger,
        clock,
        [
            *_PRELUDE,
            {"boundary": "intent-committed"},
            {"boundary": "step:checks", "step_id": "checks", "status": "started"},
            {"boundary": "step:checks", "step_id": "checks", "status": "completed"},
            {"boundary": "step:graph-promote", "step_id": "graph-promote", "status": "started"},
            {"boundary": "step:graph-promote", "step_id": "graph-promote", "status": "completed"},
            {"boundary": "step:git-push", "step_id": "git-push", "status": "started"},
        ],
    )
    counters: dict[str, int] = {}
    saga = _saga(ledger, clock, _steps(counters))
    recovery = saga.recover()
    assert recovery.status == "needs-reconciliation"
    assert recovery.uncertain_steps == ("git-push",)
    # The non-idempotent push was NOT re-executed and NOT declared failed.
    assert "git-push" not in counters
    statuses = {(e.step_id, e.status) for e in saga.entries() if e.step_id == "git-push"}
    assert ("git-push", "failed") not in statuses
    assert ("git-push", "unknown") in statuses
    # Completed steps were not re-run, and later stores did not settle past
    # the uncertain boundary.
    assert "checks" not in counters
    assert "graph-promote" not in counters
    assert "record-decision" not in counters


def test_recover_after_recovery_crash_keeps_step_uncertain_without_rejournaling(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    # A previous recovery already journaled the step as unknown; a second
    # recovery must respect that verdict without duplicating journal entries.
    _seed_journal(
        ledger,
        clock,
        [
            *_PRELUDE,
            {"boundary": "intent-committed"},
            {"boundary": "step:checks", "step_id": "checks", "status": "started"},
            {"boundary": "step:checks", "step_id": "checks", "status": "completed"},
            {"boundary": "step:git-push", "step_id": "git-push", "status": "unknown"},
        ],
    )
    counters: dict[str, int] = {}
    saga = _saga(ledger, clock, _steps(counters))
    recovery = saga.recover()
    assert recovery.status == "needs-reconciliation"
    assert recovery.uncertain_steps == ("git-push",)
    assert "git-push" not in counters
    unknown_entries = [
        e for e in saga.entries() if e.step_id == "git-push" and e.status == "unknown"
    ]
    assert len(unknown_entries) == 1  # not re-journaled


def test_crash_after_external_success_in_saga_step_keeps_exactly_one_effect(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    external_registry: list[str] = []

    def push_then_crash(ctx: MutableMapping[str, Any]) -> None:
        external_registry.append("artifact-1")
        raise KeyboardInterrupt

    steps = [SagaStep("publish", EffectClass.IRREVERSIBLE_GATED, push_then_crash)]
    saga = _saga(ledger, clock, steps)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    assert external_registry == ["artifact-1"]
    recovery = _saga(ledger, clock, steps).recover()
    assert recovery.status == "needs-reconciliation"
    assert recovery.uncertain_steps == ("publish",)
    assert external_registry == ["artifact-1"]  # still exactly one


def test_step_failure_after_earlier_settlements_compensates_and_recovers_as_failed(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}
    steps = _steps(counters)

    def registry_rejects(ctx: MutableMapping[str, Any]) -> None:
        raise RuntimeError("registry rejected the artifact")

    steps[2] = SagaStep("git-push", EffectClass.IRREVERSIBLE_GATED, registry_rejects)
    saga = _saga(ledger, clock, steps)
    with pytest.raises(GateFailedError, match="git-push failed"):
        saga.run()
    # The reversible completed step was compensated exactly once.
    assert counters["undo-graph-promote"] == 1
    assert "record-decision" not in counters
    recovery = _saga(ledger, clock, _steps({})).recover()
    assert recovery.status == "failed"
    assert counters["undo-graph-promote"] == 1  # recovery re-ran nothing


def test_crash_during_saga_compensation_recovers_as_failed_for_review(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    counters: dict[str, int] = {}

    def compensation_crashes(ctx: MutableMapping[str, Any]) -> None:
        raise KeyboardInterrupt

    def fails(ctx: MutableMapping[str, Any]) -> None:
        raise RuntimeError("second store rejected the settlement")

    steps = [
        SagaStep(
            "graph-promote",
            EffectClass.REVERSIBLE,
            lambda ctx: counters.update(done=1),
            compensation=compensation_crashes,
        ),
        SagaStep("git-push", EffectClass.IRREVERSIBLE_GATED, fails),
    ]
    saga = _saga(ledger, clock, steps)
    with pytest.raises(KeyboardInterrupt):
        saga.run()
    # The crash interrupted compensation; the durable journal still shows the
    # failed step, so recovery demands review instead of guessing.
    recovery = _saga(ledger, clock, steps).recover()
    assert recovery.status == "failed"


def test_recovered_saga_journal_is_append_only_history(
    ledger: LedgerStore, clock: FrozenClock
) -> None:
    _seed_journal(ledger, clock, [*_PRELUDE, {"boundary": "intent-committed"}])
    before = len(_saga(ledger, clock, []).entries())
    saga = _saga(ledger, clock, _steps({}))
    saga.recover()
    entries = saga.entries()
    assert len(entries) > before
    assert [entry.seq for entry in entries] == list(range(len(entries)))
    assert entries[-1].boundary == "saga-completed"
