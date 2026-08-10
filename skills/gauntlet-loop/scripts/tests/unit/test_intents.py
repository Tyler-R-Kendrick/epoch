"""Write-ahead intent service: transition matrix, immutability, staleness."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.canonical_json import digest_value
from gauntlet.constants import INTENT_TRANSITIONS, IntentState, VoteDecision, VoterKind
from gauntlet.errors import GateFailedError, InvalidInvocationError, SecurityViolationError
from gauntlet.intents import IntentService
from gauntlet.ledger import LedgerStore
from gauntlet.models import ActionIntentV1, AuthorityDecisionV1, VoteV1
from gauntlet.support import FrozenClock, SequentialIdGenerator
from tests.factories import (
    POLICY_DIGEST,
    SPEC_DIGEST,
    RecordingEmitter,
    make_intent,
    seed_intent_state,
)

ALL_STATES = list(IntentState)


@pytest.fixture()
def ledger(tmp_path: Path) -> LedgerStore:
    return LedgerStore(tmp_path / "ledger")


@pytest.fixture()
def emitter() -> RecordingEmitter:
    return RecordingEmitter()


@pytest.fixture()
def service(ledger: LedgerStore, clock: FrozenClock, emitter: RecordingEmitter) -> IntentService:
    return IntentService(ledger, clock=clock, emitter=emitter)


def _decision(
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    intent: ActionIntentV1,
    outcome: str = "committed",
) -> AuthorityDecisionV1:
    return AuthorityDecisionV1(
        decision_id=ids.new_id("decision"),
        intent_id=intent.intent_id,
        outcome=outcome,  # type: ignore[arg-type]
        policy_digest=POLICY_DIGEST,
        reason="test decision",
        decided_at=clock.now(),
    )


# ---------------------------------------------------------------------------
# Propose and durable history
# ---------------------------------------------------------------------------


def test_propose_persists_durably_and_emits(
    service: IntentService,
    ledger: LedgerStore,
    emitter: RecordingEmitter,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
) -> None:
    intent = make_intent(ids, clock)
    service.propose(intent)
    stored = service.current(intent.intent_id)
    assert stored.state is IntentState.PROPOSED
    assert f"{intent.intent_id}.state.0000.proposed" in ledger.list_ids("decisions")
    assert emitter.types() == ["dev.gauntlet.intent.proposed.v1"]


def test_propose_rejects_non_proposed_state(
    service: IntentService, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(ids, clock).model_copy(update={"state": IntentState.COMMITTED})
    with pytest.raises(InvalidInvocationError, match="must be proposed"):
        service.propose(intent)


def test_propose_rejects_duplicates(
    service: IntentService, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    intent = make_intent(ids, clock)
    service.propose(intent)
    with pytest.raises(InvalidInvocationError, match="already proposed"):
        service.propose(intent)


def test_unknown_intent_fails(service: IntentService) -> None:
    with pytest.raises(InvalidInvocationError, match="unknown intent"):
        service.current("intent:missing")


# ---------------------------------------------------------------------------
# Full transition matrix
# ---------------------------------------------------------------------------


def _attempt(
    service: IntentService,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    intent: ActionIntentV1,
    to_state: IntentState,
) -> None:
    if to_state is IntentState.VOTING:
        service.begin_voting(intent.intent_id)
    elif to_state is IntentState.COMMITTED:
        service.apply_decision(
            intent.intent_id,
            _decision(ids, clock, intent),
            current_policy_digest=POLICY_DIGEST,
        )
    elif to_state is IntentState.ABORTED:
        service.abort(intent.intent_id, reason="matrix")
    elif to_state is IntentState.EXECUTING:
        service.mark_executing(intent.intent_id, current_policy_digest=POLICY_DIGEST)
    elif to_state is IntentState.PROPOSED:
        raise InvalidInvocationError("no public path back to proposed")
    else:
        service.settle(intent.intent_id, to_state)


@pytest.mark.parametrize("from_state", ALL_STATES)
@pytest.mark.parametrize("to_state", ALL_STATES)
def test_transition_matrix(
    tmp_path: Path,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    from_state: IntentState,
    to_state: IntentState,
) -> None:
    ledger = LedgerStore(tmp_path / "matrix")
    service = IntentService(ledger, clock=clock, emitter=RecordingEmitter())
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, from_state)
    legal = to_state in INTENT_TRANSITIONS[from_state]
    if legal:
        _attempt(service, ids, clock, intent, to_state)
        assert service.current(intent.intent_id).state is to_state
        # Append-only: the original snapshot is still the first record.
        assert service.history(intent.intent_id)[0].state is from_state
    else:
        with pytest.raises(InvalidInvocationError):
            _attempt(service, ids, clock, intent, to_state)
        assert service.current(intent.intent_id).state is from_state


# ---------------------------------------------------------------------------
# Votes and decisions are immutable, append-only records
# ---------------------------------------------------------------------------


def _voting_intent(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> ActionIntentV1:
    intent = make_intent(ids, clock)
    service.propose(intent)
    service.begin_voting(intent.intent_id)
    return intent


def _vote(
    ids: SequentialIdGenerator, clock: FrozenClock, intent: ActionIntentV1, reason: str
) -> VoteV1:
    return VoteV1(
        vote_id=ids.new_id("vote"),
        intent_id=intent.intent_id,
        voter_kind=VoterKind.DETERMINISTIC_POLICY,
        voter_version="test/1.0.0",
        decision=VoteDecision.APPROVE,
        reason=reason,
        created_at=clock.now(),
    )


def test_votes_require_voting_state(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = make_intent(ids, clock)
    service.propose(intent)
    with pytest.raises(InvalidInvocationError, match="only recorded while voting"):
        service.record_vote(_vote(ids, clock, intent, "too early"))


def test_votes_are_immutable_and_corrections_append(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = _voting_intent(service, ids, clock)
    vote = _vote(ids, clock, intent, "original reasoning")
    service.record_vote(vote)
    tampered = vote.model_copy(update={"reason": "rewritten reasoning"})
    with pytest.raises(SecurityViolationError, match="already exists"):
        service.record_vote(tampered)
    correction = _vote(ids, clock, intent, "corrected reasoning")
    service.record_vote(correction)
    assert correction.vote_id != vote.vote_id


def test_decisions_are_immutable(
    service: IntentService,
    ledger: LedgerStore,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
) -> None:
    intent = _voting_intent(service, ids, clock)
    decision = _decision(ids, clock, intent)
    service.apply_decision(intent.intent_id, decision, current_policy_digest=POLICY_DIGEST)
    tampered = decision.model_copy(update={"reason": "post-hoc rewrite"})
    with pytest.raises(SecurityViolationError, match="already exists"):
        ledger.append("decisions", tampered.decision_id, tampered)


def test_apply_decision_rejects_intent_mismatch(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = _voting_intent(service, ids, clock)
    other = make_intent(ids, clock)
    with pytest.raises(InvalidInvocationError, match="targets"):
        service.apply_decision(
            intent.intent_id,
            _decision(ids, clock, other),
            current_policy_digest=POLICY_DIGEST,
        )


def test_aborted_decision_aborts_the_intent(
    service: IntentService,
    emitter: RecordingEmitter,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
) -> None:
    intent = _voting_intent(service, ids, clock)
    service.apply_decision(
        intent.intent_id,
        _decision(ids, clock, intent, outcome="aborted"),
        current_policy_digest=POLICY_DIGEST,
    )
    assert service.current(intent.intent_id).state is IntentState.ABORTED
    assert "dev.gauntlet.intent.aborted.v1" in emitter.types()


def test_committed_decision_emits_event(
    service: IntentService,
    emitter: RecordingEmitter,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
) -> None:
    intent = _voting_intent(service, ids, clock)
    service.apply_decision(
        intent.intent_id, _decision(ids, clock, intent), current_policy_digest=POLICY_DIGEST
    )
    assert "dev.gauntlet.intent.committed.v1" in emitter.types()


# ---------------------------------------------------------------------------
# Stale-intent invalidation
# ---------------------------------------------------------------------------


def test_stale_policy_digest_refuses_commit(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = _voting_intent(service, ids, clock)
    changed = digest_value({"policy": "rotated"})
    with pytest.raises(GateFailedError, match="policy digest changed"):
        service.apply_decision(
            intent.intent_id, _decision(ids, clock, intent), current_policy_digest=changed
        )
    assert service.current(intent.intent_id).state is IntentState.VOTING


def test_stale_spec_digest_refuses_commit(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = make_intent(ids, clock, spec_digest=SPEC_DIGEST)
    service.propose(intent)
    service.begin_voting(intent.intent_id)
    with pytest.raises(GateFailedError, match="spec digest changed"):
        service.apply_decision(
            intent.intent_id,
            _decision(ids, clock, intent),
            current_policy_digest=POLICY_DIGEST,
            current_spec_digest=digest_value({"spec": "refrozen"}),
        )


def test_matching_spec_digest_commits(
    service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = make_intent(ids, clock, spec_digest=SPEC_DIGEST)
    service.propose(intent)
    service.begin_voting(intent.intent_id)
    service.apply_decision(
        intent.intent_id,
        _decision(ids, clock, intent),
        current_policy_digest=POLICY_DIGEST,
        current_spec_digest=SPEC_DIGEST,
    )
    assert service.current(intent.intent_id).state is IntentState.COMMITTED


def test_stale_policy_digest_refuses_execution(
    service: IntentService,
    ledger: LedgerStore,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
) -> None:
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, IntentState.COMMITTED)
    with pytest.raises(GateFailedError, match="policy digest changed"):
        service.mark_executing(
            intent.intent_id, current_policy_digest=digest_value({"policy": "rotated"})
        )
    assert service.current(intent.intent_id).state is IntentState.COMMITTED


# ---------------------------------------------------------------------------
# Evidence gate integration
# ---------------------------------------------------------------------------


class _BlockingGate:
    def evidence_valid(self, intent: ActionIntentV1) -> tuple[bool, list[str]]:
        return False, ["belief belief:000001 is revoked"]


class _PassingGate:
    def evidence_valid(self, intent: ActionIntentV1) -> tuple[bool, list[str]]:
        return True, []


def test_evidence_gate_blocks_commit(
    ledger: LedgerStore, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    service = IntentService(
        ledger, clock=clock, emitter=RecordingEmitter(), evidence_gate=_BlockingGate()
    )
    intent = make_intent(ids, clock)
    service.propose(intent)
    service.begin_voting(intent.intent_id)
    with pytest.raises(GateFailedError, match="no longer valid"):
        service.apply_decision(
            intent.intent_id, _decision(ids, clock, intent), current_policy_digest=POLICY_DIGEST
        )
    assert service.current(intent.intent_id).state is IntentState.VOTING


def test_evidence_gate_allows_commit_with_valid_evidence(
    ledger: LedgerStore, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    service = IntentService(
        ledger, clock=clock, emitter=RecordingEmitter(), evidence_gate=_PassingGate()
    )
    intent = make_intent(ids, clock)
    service.propose(intent)
    service.begin_voting(intent.intent_id)
    service.apply_decision(
        intent.intent_id, _decision(ids, clock, intent), current_policy_digest=POLICY_DIGEST
    )
    assert service.current(intent.intent_id).state is IntentState.COMMITTED


# ---------------------------------------------------------------------------
# Settlement events
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("outcome", "event_type"),
    [
        (IntentState.COMPLETED, "dev.gauntlet.effect.completed.v1"),
        (IntentState.FAILED_BEFORE_EFFECT, "dev.gauntlet.effect.failed.v1"),
        (IntentState.FAILED_AFTER_EFFECT, "dev.gauntlet.effect.failed.v1"),
        (IntentState.OUTCOME_UNKNOWN, "dev.gauntlet.effect.unknown.v1"),
    ],
)
def test_settlement_emits_the_matching_event(
    ledger: LedgerStore,
    emitter: RecordingEmitter,
    service: IntentService,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    outcome: IntentState,
    event_type: str,
) -> None:
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, IntentState.EXECUTING)
    service.settle(intent.intent_id, outcome)
    assert emitter.types()[-1] == event_type


def test_settle_rejects_non_settlement_outcomes(
    ledger: LedgerStore, service: IntentService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    intent = make_intent(ids, clock)
    seed_intent_state(ledger, intent, IntentState.EXECUTING)
    with pytest.raises(InvalidInvocationError, match="not a settlement outcome"):
        service.settle(intent.intent_id, IntentState.VOTING)
    # The refused settlement must not have appended anything.
    assert service.current(intent.intent_id).state is IntentState.EXECUTING
