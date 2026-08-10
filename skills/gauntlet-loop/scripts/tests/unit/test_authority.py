"""Authority policy engine: fail-closed loading, ceilings, voters, quorum."""

from __future__ import annotations

import pytest

from gauntlet.authority import (
    AuthorityEngine,
    BudgetVoter,
    DeterministicPolicyVoter,
    EvaluatorPromotionVoter,
    HumanApprovalVoter,
    LlmSemanticVoter,
    SpecScopeVoter,
    _parse_approval,
    capability_rule,
    default_authority_policy,
    load_authority_policy,
    policy_digest,
    required_approval,
    resolve_effective_ceiling,
)
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ActionClass, EffectClass, VoteDecision, VoterKind
from gauntlet.errors import ApprovalRequiredError, InvalidInvocationError
from gauntlet.models import ActionIntentV1, ActorRefV1, AuthorityDecisionV1, VoteV1
from gauntlet.support import FrozenClock, SequentialIdGenerator
from tests.factories import POLICY, POLICY_DIGEST, make_intent


def _policy_document() -> dict[str, object]:
    return POLICY.model_dump(mode="json")


# ---------------------------------------------------------------------------
# Policy loading fails closed
# ---------------------------------------------------------------------------


def test_default_policy_matches_constants_capability_map() -> None:
    policy = default_authority_policy()
    assert policy.capabilities["push"].action_class is ActionClass.R3
    assert policy.capabilities["push"].approval == "human"
    assert policy.capabilities["validate"].action_class is ActionClass.R0
    assert policy.capabilities["validate"].approval is None
    assert policy.capabilities["change-trust-root"].approval == "governance"
    assert policy.default_ceiling is ActionClass.R1
    assert policy.fail_closed is True


def test_load_valid_policy_roundtrips() -> None:
    policy = load_authority_policy(_policy_document())
    assert policy == POLICY
    assert policy_digest(policy) == POLICY_DIGEST


@pytest.mark.parametrize(
    "mutation",
    [
        {"schema_version": "dev.gauntlet.authority-policy/v2"},
        {"default_ceiling": "R9"},
        {"fail_closed": False},
        {"capabilities": {}},
        {"capabilities": {"push": {"approval": "human"}}},
        {"capabilities": {"push": {"action_class": "medium"}}},
        {"capabilities": {"push": {"action_class": "R3", "approval": "manager"}}},
        {"unexpected": "field"},
    ],
)
def test_invalid_policy_documents_fail_closed(mutation: dict[str, object]) -> None:
    document = _policy_document()
    document.update(mutation)
    with pytest.raises(InvalidInvocationError):
        load_authority_policy(document)


def test_parse_approval_rejects_unknown_values() -> None:
    with pytest.raises(InvalidInvocationError):
        _parse_approval("manager")
    assert _parse_approval(None) is None
    assert _parse_approval("human") == "human"


def test_unknown_capability_fails_closed() -> None:
    with pytest.raises(InvalidInvocationError, match="unknown capability"):
        capability_rule(POLICY, "launch-rockets")


def test_action_class_mismatch_fails_closed(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    intent = make_intent(ids, clock, capability="push", action_class=ActionClass.R1)
    with pytest.raises(InvalidInvocationError, match="does not match"):
        required_approval(POLICY, intent, ActionClass.R1)


def test_required_approval_escalates_only_unapproved_classes_above_ceiling(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    r1 = make_intent(ids, clock, capability="write-gauntlet-state", action_class=ActionClass.R1)
    assert required_approval(POLICY, r1, ActionClass.R1) is None
    # Local lowering to R0: R1 loses automatic approval and needs a human.
    assert required_approval(POLICY, r1, ActionClass.R0) == "human"
    # R2's own rule ("required") stands; the ceiling does not tighten it.
    r2 = make_intent(ids, clock, capability="install-dependency", action_class=ActionClass.R2)
    assert required_approval(POLICY, r2, ActionClass.R1) == "required"


# ---------------------------------------------------------------------------
# Effective ceiling: lowering allowed, raising needs R4 governance
# ---------------------------------------------------------------------------


def test_ceiling_default_and_lowering(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    assert resolve_effective_ceiling(POLICY, None) is ActionClass.R1
    assert resolve_effective_ceiling(POLICY, ActionClass.R0) is ActionClass.R0
    assert resolve_effective_ceiling(POLICY, ActionClass.R1) is ActionClass.R1


def test_ceiling_raise_without_governance_is_rejected() -> None:
    with pytest.raises(ApprovalRequiredError, match="governance decision"):
        resolve_effective_ceiling(POLICY, ActionClass.R2)


def _governance_pair(
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    *,
    capability: str = "change-authority-policy",
    action_class: ActionClass = ActionClass.R4,
    outcome: str = "committed",
    mismatch_intent: bool = False,
) -> tuple[AuthorityDecisionV1, ActionIntentV1]:
    intent = make_intent(ids, clock, capability=capability, action_class=action_class)
    decision = AuthorityDecisionV1(
        decision_id=ids.new_id("decision"),
        intent_id=ids.new_id("intent") if mismatch_intent else intent.intent_id,
        outcome=outcome,  # type: ignore[arg-type]
        policy_digest=POLICY_DIGEST,
        reason="governance test",
        decided_at=clock.now(),
    )
    return decision, intent


def test_ceiling_raise_with_tracked_governance_decision(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    decision, intent = _governance_pair(clock, ids)
    resolved = resolve_effective_ceiling(
        POLICY, ActionClass.R2, governance_decision=decision, governed_intent=intent
    )
    assert resolved is ActionClass.R2


@pytest.mark.parametrize(
    "kwargs",
    [
        {"outcome": "aborted"},
        {"mismatch_intent": True},
        {"capability": "change-trust-root"},
        {"capability": "push", "action_class": ActionClass.R3},
    ],
)
def test_ceiling_raise_with_defective_governance_decision_is_rejected(
    clock: FrozenClock, ids: SequentialIdGenerator, kwargs: dict[str, object]
) -> None:
    decision, intent = _governance_pair(clock, ids, **kwargs)  # type: ignore[arg-type]
    with pytest.raises(ApprovalRequiredError, match="does not authorize"):
        resolve_effective_ceiling(
            POLICY, ActionClass.R2, governance_decision=decision, governed_intent=intent
        )


def test_ceiling_raise_with_only_decision_or_only_intent_is_rejected(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    decision, intent = _governance_pair(clock, ids)
    with pytest.raises(ApprovalRequiredError):
        resolve_effective_ceiling(POLICY, ActionClass.R2, governance_decision=decision)
    with pytest.raises(ApprovalRequiredError):
        resolve_effective_ceiling(POLICY, ActionClass.R2, governed_intent=intent)


# ---------------------------------------------------------------------------
# Voters
# ---------------------------------------------------------------------------


def test_deterministic_voter_approves_conformant_intent(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    voter = DeterministicPolicyVoter(POLICY, clock=clock, ids=ids)
    vote = voter.vote(make_intent(ids, clock))
    assert vote.decision is VoteDecision.APPROVE
    assert vote.voter_kind is VoterKind.DETERMINISTIC_POLICY
    assert vote.policy_digest == POLICY_DIGEST


@pytest.mark.parametrize(
    ("capability", "action_class", "policy_digest_value", "match"),
    [
        ("launch-rockets", ActionClass.R1, POLICY_DIGEST, "unknown capability"),
        ("push", ActionClass.R1, POLICY_DIGEST, "does not match"),
        ("write-gauntlet-state", ActionClass.R1, digest_value({"other": 1}), "stale policy"),
    ],
)
def test_deterministic_voter_rejects_fail_closed(
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    capability: str,
    action_class: ActionClass,
    policy_digest_value: str,
    match: str,
) -> None:
    voter = DeterministicPolicyVoter(POLICY, clock=clock, ids=ids)
    intent = make_intent(
        ids,
        clock,
        capability=capability,
        action_class=action_class,
        policy_digest_value=policy_digest_value,
    )
    vote = voter.vote(intent)
    assert vote.decision is VoteDecision.REJECT
    assert match in vote.reason


def test_spec_scope_voter(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    voter = SpecScopeVoter(["src/**", "docs/*"], policy_digest=POLICY_DIGEST, clock=clock, ids=ids)
    good = voter.vote(make_intent(ids, clock, write_scopes=["src/app/main.py"]))
    assert good.decision is VoteDecision.APPROVE
    bad = voter.vote(make_intent(ids, clock, write_scopes=["secrets/key.pem"]))
    assert bad.decision is VoteDecision.REJECT
    assert "secrets/key.pem" in bad.reason


def test_budget_voter(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    approving = BudgetVoter(
        lambda _: (True, "within budget"), policy_digest=POLICY_DIGEST, clock=clock, ids=ids
    )
    rejecting = BudgetVoter(
        lambda _: (False, "budget exhausted"), policy_digest=POLICY_DIGEST, clock=clock, ids=ids
    )
    intent = make_intent(ids, clock)
    assert approving.vote(intent).decision is VoteDecision.APPROVE
    vote = rejecting.vote(intent)
    assert vote.decision is VoteDecision.REJECT
    assert vote.reason == "budget exhausted"
    assert vote.voter_kind is VoterKind.BUDGET


def test_evaluator_promotion_voter_hook(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    evidence = digest_value({"evaluation": "passed"})
    voter = EvaluatorPromotionVoter(
        lambda _: (VoteDecision.APPROVE, "evaluation passed", evidence),
        policy_digest=POLICY_DIGEST,
        clock=clock,
        ids=ids,
    )
    vote = voter.vote(make_intent(ids, clock))
    assert vote.decision is VoteDecision.APPROVE
    assert vote.evidence_digest == evidence
    assert vote.voter_kind is VoterKind.EVALUATOR_PROMOTION


def test_human_approval_voter_requires_human_actor(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    robot = ActorRefV1(actor_id="bot-1", kind="agent")
    with pytest.raises(InvalidInvocationError, match="human actor"):
        HumanApprovalVoter(
            robot,
            VoteDecision.APPROVE,
            "lgtm",
            policy_digest=POLICY_DIGEST,
            clock=clock,
            ids=ids,
        )


def test_human_approval_vote_record_is_complete(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    human = ActorRefV1(actor_id="alice", kind="human")
    voter = HumanApprovalVoter(
        human,
        VoteDecision.APPROVE,
        "reviewed the plan",
        policy_digest=POLICY_DIGEST,
        clock=clock,
        ids=ids,
        expires_at="2027-01-01T00:00:00Z",
    )
    vote = voter.vote(make_intent(ids, clock))
    assert vote.voter_kind is VoterKind.HUMAN_APPROVAL
    assert "approver=alice" in vote.voter_version
    assert vote.policy_digest == POLICY_DIGEST
    assert vote.reason == "reviewed the plan"
    assert vote.expires_at == "2027-01-01T00:00:00Z"
    assert vote.created_at
    assert vote.vote_id.startswith("vote:")


class _Advisor:
    def __init__(self, decision: VoteDecision, reason: str) -> None:
        self._decision = decision
        self._reason = reason

    def assess(self, intent: ActionIntentV1) -> tuple[VoteDecision, str]:
        return self._decision, self._reason


def test_llm_semantic_voter_interface(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    voter = LlmSemanticVoter(
        _Advisor(VoteDecision.REJECT, "semantic drift detected"),
        policy_digest=POLICY_DIGEST,
        clock=clock,
        ids=ids,
    )
    vote = voter.vote(make_intent(ids, clock))
    assert vote.voter_kind is VoterKind.LLM_SEMANTIC
    assert vote.decision is VoteDecision.REJECT


# ---------------------------------------------------------------------------
# Quorum and decision assembly
# ---------------------------------------------------------------------------


def _vote(
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    intent: ActionIntentV1,
    kind: VoterKind,
    decision: VoteDecision,
    *,
    expires_at: str | None = None,
) -> VoteV1:
    return VoteV1(
        vote_id=ids.new_id("vote"),
        intent_id=intent.intent_id,
        voter_kind=kind,
        voter_version="test/1.0.0",
        policy_digest=POLICY_DIGEST,
        decision=decision,
        reason=f"{kind.value} {decision.value}",
        expires_at=expires_at,
        created_at=clock.now(),
    )


def _engine(clock: FrozenClock, ids: SequentialIdGenerator) -> AuthorityEngine:
    return AuthorityEngine(POLICY, clock=clock, ids=ids)


def test_deterministic_alone_approves_r0_and_r1(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    engine = _engine(clock, ids)
    for capability, action_class in (("inspect", ActionClass.R0), (None, ActionClass.R1)):
        intent = make_intent(
            ids, clock, capability=capability or "write-gauntlet-state", action_class=action_class
        )
        det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
        decision = engine.decide(intent, [det])
        assert decision.outcome == "committed"
        assert decision.policy_digest == POLICY_DIGEST
        assert decision.votes == [det]


def test_missing_deterministic_vote_aborts(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock)
    human = _vote(ids, clock, intent, VoterKind.HUMAN_APPROVAL, VoteDecision.APPROVE)
    decision = engine.decide(intent, [human])
    assert decision.outcome == "aborted"
    assert "deterministic policy voter" in decision.reason


def test_abstaining_deterministic_vote_aborts(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.ABSTAIN)
    assert engine.decide(intent, [det]).outcome == "aborted"


def test_any_reject_vote_vetoes(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    veto = _vote(ids, clock, intent, VoterKind.LLM_SEMANTIC, VoteDecision.REJECT)
    decision = engine.decide(intent, [det, veto])
    assert decision.outcome == "aborted"
    assert "rejected by" in decision.reason


def test_r2_requires_an_additional_approval(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(
        ids, clock, capability="run-costly-experiment", action_class=ActionClass.R2
    )
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    assert engine.decide(intent, [det]).outcome == "aborted"
    budget = _vote(ids, clock, intent, VoterKind.BUDGET, VoteDecision.APPROVE)
    assert engine.decide(intent, [det, budget]).outcome == "committed"


def test_r3_requires_a_human_approval_vote(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock, capability="push", action_class=ActionClass.R3)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    evaluator = _vote(ids, clock, intent, VoterKind.EVALUATOR_PROMOTION, VoteDecision.APPROVE)
    decision = engine.decide(intent, [det, evaluator])
    assert decision.outcome == "aborted"
    assert "human approval" in decision.reason
    human = _vote(ids, clock, intent, VoterKind.HUMAN_APPROVAL, VoteDecision.APPROVE)
    assert engine.decide(intent, [det, human]).outcome == "committed"


def test_llm_vote_can_never_solely_approve_r3_or_r4(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    engine = _engine(clock, ids)
    for capability, action_class in (
        ("push", ActionClass.R3),
        ("change-frozen-spec", ActionClass.R4),
    ):
        intent = make_intent(ids, clock, capability=capability, action_class=action_class)
        det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
        llm = _vote(ids, clock, intent, VoterKind.LLM_SEMANTIC, VoteDecision.APPROVE)
        decision = engine.decide(intent, [det, llm], governance_decision_id="decision:governance-1")
        assert decision.outcome == "aborted"
        assert "LLM votes never satisfy" in decision.reason


def test_r4_requires_governance_gate(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(
        ids, clock, capability="change-authority-policy", action_class=ActionClass.R4
    )
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    human = _vote(ids, clock, intent, VoterKind.HUMAN_APPROVAL, VoteDecision.APPROVE)
    without_gate = engine.decide(intent, [det, human])
    assert without_gate.outcome == "aborted"
    assert "governance" in without_gate.reason
    with_gate = engine.decide(intent, [det, human], governance_decision_id="decision:governance-1")
    assert with_gate.outcome == "committed"
    assert "decision:governance-1" in with_gate.reason


def test_expired_approval_votes_are_ignored(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock, capability="push", action_class=ActionClass.R3)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    stale_human = _vote(
        ids,
        clock,
        intent,
        VoterKind.HUMAN_APPROVAL,
        VoteDecision.APPROVE,
        expires_at="2020-01-01T00:00:00Z",
    )
    decision = engine.decide(intent, [det, stale_human])
    assert decision.outcome == "aborted"
    # The expired vote is still part of the immutable record.
    assert stale_human in decision.votes


def test_invalid_intent_aborts_with_reason(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock, capability="launch-rockets", action_class=ActionClass.R1)
    decision = engine.decide(intent, [])
    assert decision.outcome == "aborted"
    assert "unknown capability" in decision.reason


def test_lowered_ceiling_removes_automatic_r1_approval(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    engine = AuthorityEngine(POLICY, clock=clock, ids=ids, effective_ceiling=ActionClass.R0)
    intent = make_intent(ids, clock)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    assert engine.decide(intent, [det]).outcome == "aborted"
    human = _vote(ids, clock, intent, VoterKind.HUMAN_APPROVAL, VoteDecision.APPROVE)
    assert engine.decide(intent, [det, human]).outcome == "committed"


def test_decision_record_is_complete(clock: FrozenClock, ids: SequentialIdGenerator) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    decision = engine.decide(intent, [det])
    assert decision.decision_id.startswith("decision:")
    assert decision.intent_id == intent.intent_id
    assert decision.policy_digest == engine.current_policy_digest == POLICY_DIGEST
    assert decision.decided_at
    assert decision.votes == [det]


def test_effect_class_is_orthogonal_to_authority(
    clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    engine = _engine(clock, ids)
    intent = make_intent(ids, clock, effect_class=EffectClass.IRREVERSIBLE_GATED)
    det = _vote(ids, clock, intent, VoterKind.DETERMINISTIC_POLICY, VoteDecision.APPROVE)
    # R1 quorum is unchanged by the effect class; effect handling is the
    # executor's concern.
    assert engine.decide(intent, [det]).outcome == "committed"
