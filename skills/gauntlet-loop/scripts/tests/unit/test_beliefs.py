"""Belief lifecycle matrix, revocation cascade, blocked intents, incidents."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.beliefs import BeliefService
from gauntlet.canonical_json import digest_value
from gauntlet.constants import BELIEF_TRANSITIONS, BeliefState
from gauntlet.errors import GateFailedError, InvalidInvocationError
from gauntlet.ledger import LedgerStore
from gauntlet.models import BeliefV1, DigestRefV1, EvidenceRefV1, ObservationV1, ToolRefV1
from gauntlet.support import FrozenClock, SequentialIdGenerator
from tests.factories import RecordingEmitter, make_intent

ALL_STATES = list(BeliefState)


class PermissivePolicy:
    def satisfies_action_policy(self, belief: BeliefV1) -> tuple[bool, str]:
        return True, "evidence floor met"


class RejectingPolicy:
    def satisfies_action_policy(self, belief: BeliefV1) -> tuple[bool, str]:
        return False, "no independent corroboration"


@pytest.fixture()
def ledger(tmp_path: Path) -> LedgerStore:
    return LedgerStore(tmp_path / "ledger")


@pytest.fixture()
def emitter() -> RecordingEmitter:
    return RecordingEmitter()


@pytest.fixture()
def service(
    ledger: LedgerStore,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    emitter: RecordingEmitter,
) -> BeliefService:
    return BeliefService(
        ledger,
        clock=clock,
        ids=ids,
        emitter=emitter,
        evidence_policy=PermissivePolicy(),
    )


def _observation(ids: SequentialIdGenerator, clock: FrozenClock) -> ObservationV1:
    raw = digest_value({"trace": "raw"})
    return ObservationV1(
        observation_id=ids.new_id("observation"),
        producer=ToolRefV1(name="evaluator", version="1.0.0"),
        scope="candidate:123",
        raw_digest=DigestRefV1(value=raw.split(":")[1]),
        measured_at=clock.now(),
        values={"passed": True, "api_key": "xoxb-secret1234567890"},
    )


def _seed_state(service: BeliefService, state: BeliefState) -> BeliefV1:
    """Drive a fresh belief to ``state`` through legal transitions."""
    belief = service.create_belief("seeded belief")
    paths = {
        BeliefState.RAW: [],
        BeliefState.TENTATIVE: [BeliefState.TENTATIVE],
        BeliefState.VALIDATED: [BeliefState.TENTATIVE, BeliefState.VALIDATED],
        BeliefState.COMMITTED: [
            BeliefState.TENTATIVE,
            BeliefState.VALIDATED,
            BeliefState.COMMITTED,
        ],
        BeliefState.ACTION_SAFE: [
            BeliefState.TENTATIVE,
            BeliefState.VALIDATED,
            BeliefState.COMMITTED,
            BeliefState.ACTION_SAFE,
        ],
        BeliefState.QUARANTINED: [BeliefState.QUARANTINED],
        BeliefState.SUPERSEDED: [BeliefState.TENTATIVE, BeliefState.SUPERSEDED],
        BeliefState.REVOKED: [BeliefState.REVOKED],
    }
    for step in paths[state]:
        service.transition(belief.belief_id, step)
    return service.current(belief.belief_id)


# ---------------------------------------------------------------------------
# Observations
# ---------------------------------------------------------------------------


def test_observations_create_observations_not_beliefs(
    service: BeliefService,
    ledger: LedgerStore,
    emitter: RecordingEmitter,
    ids: SequentialIdGenerator,
    clock: FrozenClock,
) -> None:
    stored = service.record_observation(_observation(ids, clock))
    assert stored.observation_id in ledger.list_ids("decisions")
    assert not [rid for rid in ledger.list_ids("decisions") if rid.startswith("belief:")]
    assert emitter.types() == ["dev.gauntlet.observation.recorded.v1"]


def test_observation_values_are_redacted_before_persistence(
    service: BeliefService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    stored = service.record_observation(_observation(ids, clock))
    assert stored.values["api_key"] == "[REDACTED]"
    assert stored.values["passed"] is True
    assert stored.redaction_report


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


def test_new_belief_starts_raw(service: BeliefService) -> None:
    belief = service.create_belief("suspicious latency in evaluator")
    assert belief.state is BeliefState.RAW


def test_diagnosis_starts_tentative_with_appended_history(service: BeliefService) -> None:
    belief = service.propose_diagnosis("cache invalidation causes the regression")
    assert belief.state is BeliefState.TENTATIVE
    states = [snapshot.state for snapshot in service.history(belief.belief_id)]
    assert states == [BeliefState.RAW, BeliefState.TENTATIVE]


@pytest.mark.parametrize("from_state", ALL_STATES)
@pytest.mark.parametrize("to_state", ALL_STATES)
def test_lifecycle_matrix(
    tmp_path: Path,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    from_state: BeliefState,
    to_state: BeliefState,
) -> None:
    service = BeliefService(
        LedgerStore(tmp_path / "matrix"),
        clock=clock,
        ids=ids,
        emitter=RecordingEmitter(),
        evidence_policy=PermissivePolicy(),
    )
    belief = _seed_state(service, from_state)
    legal = to_state in BELIEF_TRANSITIONS[from_state]
    if legal:
        service.transition(belief.belief_id, to_state)
        assert service.current(belief.belief_id).state is to_state
        assert service.history(belief.belief_id)[0].state is BeliefState.RAW
    else:
        with pytest.raises(InvalidInvocationError):
            service.transition(belief.belief_id, to_state)
        assert service.current(belief.belief_id).state is from_state


def test_unknown_belief_fails(service: BeliefService) -> None:
    with pytest.raises(InvalidInvocationError, match="unknown belief"):
        service.current("belief:missing")


def test_validated_transition_emits_event(
    service: BeliefService, emitter: RecordingEmitter
) -> None:
    belief = service.propose_diagnosis("hypothesis")
    service.transition(belief.belief_id, BeliefState.VALIDATED)
    assert "dev.gauntlet.belief.validated.v1" in emitter.types()


# ---------------------------------------------------------------------------
# action_safe fails closed
# ---------------------------------------------------------------------------


def test_action_safe_without_policy_fails_closed(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    service = BeliefService(ledger, clock=clock, ids=ids, emitter=RecordingEmitter())
    belief = _seed_state(service, BeliefState.COMMITTED)
    with pytest.raises(GateFailedError, match="fails closed"):
        service.transition(belief.belief_id, BeliefState.ACTION_SAFE)


def test_action_safe_with_rejecting_policy_fails_closed(
    ledger: LedgerStore, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    service = BeliefService(
        ledger, clock=clock, ids=ids, emitter=RecordingEmitter(), evidence_policy=RejectingPolicy()
    )
    belief = _seed_state(service, BeliefState.COMMITTED)
    with pytest.raises(GateFailedError, match="does not satisfy the action policy"):
        service.transition(belief.belief_id, BeliefState.ACTION_SAFE)
    assert service.current(belief.belief_id).state is BeliefState.COMMITTED


def test_action_safe_with_satisfying_evidence(service: BeliefService) -> None:
    belief = _seed_state(service, BeliefState.COMMITTED)
    updated = service.transition(belief.belief_id, BeliefState.ACTION_SAFE)
    assert updated.state is BeliefState.ACTION_SAFE


# ---------------------------------------------------------------------------
# Dependents and revocation cascade
# ---------------------------------------------------------------------------


def test_register_dependent_validates_kind_and_belief(service: BeliefService) -> None:
    belief = service.create_belief("base")
    with pytest.raises(InvalidInvocationError, match="unknown dependent kind"):
        service.register_dependent(belief.belief_id, "rumor", "rumor:1")
    with pytest.raises(InvalidInvocationError, match="unknown belief"):
        service.register_dependent("belief:missing", "release", "release:1")


def _cascade_fixture(service: BeliefService) -> tuple[BeliefV1, BeliefV1, BeliefV1]:
    root = service.propose_diagnosis("root diagnosis")
    middle = service.create_belief("derived belief", depends_on_beliefs=[root.belief_id])
    leaf = service.create_belief("leaf belief", depends_on_beliefs=[middle.belief_id])
    service.register_dependent(root.belief_id, "promotion", "promotion:100")
    service.register_dependent(middle.belief_id, "intervention", "intervention:200")
    service.register_dependent(middle.belief_id, "intent", "intent:300")
    service.register_dependent(leaf.belief_id, "release", "release:400")
    return root, middle, leaf


def test_revocation_cascade_computes_complete_dependent_set(
    service: BeliefService, ledger: LedgerStore, emitter: RecordingEmitter
) -> None:
    root, middle, leaf = _cascade_fixture(service)
    # An unrelated belief's dependents must stay untouched by the cascade.
    unrelated = service.create_belief("unrelated belief")
    service.register_dependent(unrelated.belief_id, "release", "release:999")
    impact = service.revoke(root.belief_id, reason="evaluator output was fabricated")
    assert unrelated.belief_id not in impact.dependent_belief_ids
    assert impact.dependent_belief_ids == sorted([middle.belief_id, leaf.belief_id])
    assert service.current(root.belief_id).state is BeliefState.REVOKED
    assert service.current(middle.belief_id).state is BeliefState.QUARANTINED
    assert service.current(leaf.belief_id).state is BeliefState.QUARANTINED
    flagged = {(flag.subject_kind, flag.subject_id) for flag in impact.flagged}
    assert flagged == {
        ("promotion", "promotion:100"),
        ("intervention", "intervention:200"),
        ("intent", "intent:300"),
        ("release", "release:400"),
    }
    assert impact.blocked_intent_ids == ["intent:300"]
    assert "dev.gauntlet.belief.revoked.v1" in emitter.types()
    assert impact.impact_id in ledger.list_ids("decisions")


def test_revocation_creates_incident_for_material_release(
    service: BeliefService, ledger: LedgerStore
) -> None:
    root, _middle, _leaf = _cascade_fixture(service)
    impact = service.revoke(root.belief_id, reason="false evidence")
    assert len(impact.incident_ids) == 1
    incidents = ledger.list_ids("incidents")
    assert impact.incident_ids[0] in incidents
    # Compensation is proposed for release and promotion dependents, never
    # executed here.
    assert len(impact.proposal_ids) == 2


def test_revocation_without_release_creates_no_incident(
    service: BeliefService, ledger: LedgerStore
) -> None:
    belief = service.propose_diagnosis("standalone")
    service.register_dependent(belief.belief_id, "experiment", "experiment:1")
    impact = service.revoke(belief.belief_id, reason="contradicted")
    assert impact.incident_ids == []
    assert ledger.list_ids("incidents") == []
    assert impact.proposal_ids == []


def test_immaterial_release_dependency_creates_no_incident(
    service: BeliefService, ledger: LedgerStore
) -> None:
    belief = service.propose_diagnosis("weak link")
    service.register_dependent(belief.belief_id, "release", "release:9", material=False)
    impact = service.revoke(belief.belief_id, reason="weak evidence collapsed")
    assert impact.incident_ids == []
    # The release is still flagged for review even though it is immaterial.
    assert [(f.subject_kind, f.subject_id) for f in impact.flagged] == [("release", "release:9")]


def test_revocation_skips_terminal_dependents_but_keeps_history(
    service: BeliefService,
) -> None:
    root = service.propose_diagnosis("root")
    dependent = service.create_belief("dependent", depends_on_beliefs=[root.belief_id])
    service.transition(dependent.belief_id, BeliefState.TENTATIVE)
    service.transition(dependent.belief_id, BeliefState.SUPERSEDED)
    impact = service.revoke(root.belief_id, reason="bad")
    assert impact.dependent_belief_ids == [dependent.belief_id]
    # Terminal states cannot be quarantined; the record stays superseded.
    assert service.current(dependent.belief_id).state is BeliefState.SUPERSEDED
    # And nothing was deleted.
    states = [s.state for s in service.history(dependent.belief_id)]
    assert states == [BeliefState.RAW, BeliefState.TENTATIVE, BeliefState.SUPERSEDED]


# ---------------------------------------------------------------------------
# Evidence gate for the intent service
# ---------------------------------------------------------------------------


def _belief_ref(belief_id: str) -> EvidenceRefV1:
    return EvidenceRefV1(kind="belief", ref_id=belief_id)


def test_evidence_valid_blocks_revoked_and_unknown_beliefs(
    service: BeliefService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    healthy = _seed_state(service, BeliefState.VALIDATED)
    revoked = _seed_state(service, BeliefState.REVOKED)
    intent = make_intent(
        ids,
        clock,
        causal_refs=[
            _belief_ref(healthy.belief_id),
            _belief_ref(revoked.belief_id),
            _belief_ref("belief:missing"),
            EvidenceRefV1(kind="observation", ref_id="observation:1"),
        ],
    )
    valid, problems = service.evidence_valid(intent)
    assert not valid
    assert any("revoked" in problem for problem in problems)
    assert any("unknown" in problem for problem in problems)
    assert len(problems) == 2  # the healthy belief and the observation pass


def test_evidence_valid_accepts_healthy_evidence(
    service: BeliefService, ids: SequentialIdGenerator, clock: FrozenClock
) -> None:
    healthy = _seed_state(service, BeliefState.ACTION_SAFE)
    intent = make_intent(ids, clock, causal_refs=[_belief_ref(healthy.belief_id)])
    valid, problems = service.evidence_valid(intent)
    assert valid
    assert problems == []
