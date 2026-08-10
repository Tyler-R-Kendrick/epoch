"""Adversarial case from the brief: a false evaluator observation drives
downstream proposals; later revocation invalidates the dependency chain
WITHOUT deleting history."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.beliefs import BeliefService
from gauntlet.canonical_json import digest_value
from gauntlet.constants import BeliefState, IntentState, VoteDecision, VoterKind
from gauntlet.errors import GateFailedError
from gauntlet.intents import IntentService
from gauntlet.ledger import LedgerStore
from gauntlet.models import (
    AuthorityDecisionV1,
    BeliefV1,
    DigestRefV1,
    EvidenceRefV1,
    ObservationV1,
    ToolRefV1,
    VoteV1,
)
from gauntlet.support import FrozenClock, SequentialIdGenerator
from tests.factories import POLICY_DIGEST, RecordingEmitter, make_intent


class PermissivePolicy:
    def satisfies_action_policy(self, belief: BeliefV1) -> tuple[bool, str]:
        return True, "evidence floor met"


@pytest.fixture()
def ledger(tmp_path: Path) -> LedgerStore:
    return LedgerStore(tmp_path / "ledger")


@pytest.fixture()
def beliefs(ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator) -> BeliefService:
    return BeliefService(
        ledger,
        clock=clock,
        ids=ids,
        emitter=RecordingEmitter(),
        evidence_policy=PermissivePolicy(),
    )


@pytest.fixture()
def intents(ledger: LedgerStore, clock: FrozenClock, beliefs: BeliefService) -> IntentService:
    # The belief service IS the evidence gate the intent service consults.
    return IntentService(ledger, clock=clock, emitter=RecordingEmitter(), evidence_gate=beliefs)


def test_false_evaluator_observation_revocation_invalidates_chain_without_deleting_history(
    ledger: LedgerStore,
    beliefs: BeliefService,
    intents: IntentService,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
) -> None:
    # --- 1. A (secretly false) evaluator observation lands as raw evidence.
    raw = digest_value({"evaluator": "fabricated-pass"})
    observation = beliefs.record_observation(
        ObservationV1(
            observation_id=ids.new_id("observation"),
            producer=ToolRefV1(name="broken-evaluator", version="0.9.0"),
            scope="candidate:42",
            raw_digest=DigestRefV1(value=raw.split(":")[1]),
            measured_at=clock.now(),
            values={"all_tests_passed": True},
        )
    )

    # --- 2. The observation drives a diagnosis, which drives derived beliefs.
    diagnosis = beliefs.propose_diagnosis(
        "candidate 42 fixes the regression",
        depends_on_observations=[observation.observation_id],
    )
    beliefs.transition(diagnosis.belief_id, BeliefState.VALIDATED)
    beliefs.transition(diagnosis.belief_id, BeliefState.COMMITTED)
    derived = beliefs.create_belief(
        "candidate 42 is safe to promote", depends_on_beliefs=[diagnosis.belief_id]
    )
    beliefs.transition(derived.belief_id, BeliefState.TENTATIVE)
    beliefs.transition(derived.belief_id, BeliefState.VALIDATED)

    # --- 3. Downstream decisions are registered against the chain.
    beliefs.register_dependent(diagnosis.belief_id, "intervention", "intervention:1")
    beliefs.register_dependent(diagnosis.belief_id, "experiment", "experiment:1")
    beliefs.register_dependent(derived.belief_id, "promotion", "promotion:1")
    beliefs.register_dependent(derived.belief_id, "release", "release:1", material=True)
    beliefs.register_dependent(derived.belief_id, "handoff", "handoff:1")

    # --- 4. A pending intent cites the diagnosis as causal evidence.
    pending = make_intent(
        ids,
        clock,
        causal_refs=[EvidenceRefV1(kind="belief", ref_id=diagnosis.belief_id)],
    )
    intents.propose(pending)
    intents.begin_voting(pending.intent_id)
    beliefs.register_dependent(diagnosis.belief_id, "intent", pending.intent_id)
    intents.record_vote(
        VoteV1(
            vote_id=ids.new_id("vote"),
            intent_id=pending.intent_id,
            voter_kind=VoterKind.DETERMINISTIC_POLICY,
            voter_version="test/1.0.0",
            decision=VoteDecision.APPROVE,
            reason="policy conformant",
            created_at=clock.now(),
        )
    )
    history_before = {
        "diagnosis": [s.state for s in beliefs.history(diagnosis.belief_id)],
        "derived": [s.state for s in beliefs.history(derived.belief_id)],
    }
    records_before = set(ledger.list_ids("decisions"))

    # --- 5. The observation is exposed as false; the diagnosis is revoked.
    impact = beliefs.revoke(diagnosis.belief_id, reason="evaluator output was fabricated")

    # The complete dependent chain was computed.
    assert impact.dependent_belief_ids == [derived.belief_id]
    flagged = {(flag.subject_kind, flag.subject_id) for flag in impact.flagged}
    assert flagged == {
        ("intervention", "intervention:1"),
        ("experiment", "experiment:1"),
        ("promotion", "promotion:1"),
        ("release", "release:1"),
        ("handoff", "handoff:1"),
        ("intent", pending.intent_id),
    }
    assert impact.blocked_intent_ids == [pending.intent_id]

    # States: revoked root, quarantined dependents; nothing deleted.
    assert beliefs.current(diagnosis.belief_id).state is BeliefState.REVOKED
    assert beliefs.current(derived.belief_id).state is BeliefState.QUARANTINED

    # A released artifact depended materially: an incident exists, and
    # compensation is proposed (never executed).
    assert len(impact.incident_ids) == 1
    assert impact.incident_ids[0] in ledger.list_ids("incidents")
    assert len(impact.proposal_ids) == 2  # promotion:1 and release:1

    # --- 6. The pending intent can no longer commit on revoked evidence.
    decision = AuthorityDecisionV1(
        decision_id=ids.new_id("decision"),
        intent_id=pending.intent_id,
        outcome="committed",
        policy_digest=POLICY_DIGEST,
        reason="approved before the revocation surfaced",
        decided_at=clock.now(),
    )
    with pytest.raises(GateFailedError, match="no longer valid"):
        intents.apply_decision(pending.intent_id, decision, current_policy_digest=POLICY_DIGEST)
    assert intents.current(pending.intent_id).state is IntentState.VOTING

    # --- 7. History is append-only: every pre-revocation record survives.
    records_after = set(ledger.list_ids("decisions"))
    assert records_before <= records_after
    assert [s.state for s in beliefs.history(diagnosis.belief_id)] == [
        *history_before["diagnosis"],
        BeliefState.REVOKED,
    ]
    assert [s.state for s in beliefs.history(derived.belief_id)] == [
        *history_before["derived"],
        BeliefState.QUARANTINED,
    ]
    # The false observation itself is still on the record, unrewritten.
    assert observation.observation_id in records_after
