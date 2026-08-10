"""Authority policy engine: policy loading, ceilings, voters, and quorum.

This module decides whether an :class:`~gauntlet.models.ActionIntentV1` may be
committed. It is fail-closed by construction:

- an unknown capability or an invalid/missing action class rejects the intent;
- local overrides may LOWER the effective ceiling, never raise it (raising
  requires a tracked R4 governance decision);
- R3 requires a human approval vote and R4 requires a governance approval;
  an LLM vote can never be the sole approval for R3/R4 (enforced structurally:
  LLM votes are excluded from the approval quorum for those classes).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from fnmatch import fnmatch
from typing import Any, Final, Literal, Protocol, cast

from pydantic import Field

from gauntlet.canonical_json import digest_value
from gauntlet.constants import (
    ACTION_CLASS_ORDER,
    DEFAULT_CAPABILITIES,
    ActionClass,
    VoteDecision,
    VoterKind,
)
from gauntlet.errors import ApprovalRequiredError, InvalidInvocationError
from gauntlet.models import (
    ActionIntentV1,
    ActorRefV1,
    AuthorityDecisionV1,
    GauntletModel,
    VoteV1,
)
from gauntlet.support import Clock, IdGenerator

AUTHORITY_POLICY_SCHEMA: Final = "dev.gauntlet.authority-policy/v1"

Approval = Literal["required", "human", "governance"]

GOVERNANCE_CAPABILITY = "change-authority-policy"


class CapabilityRuleV1(GauntletModel):
    """One capability's authority binding inside the policy document."""

    action_class: ActionClass
    approval: Approval | None = None


class AuthorityPolicyV1(GauntletModel):
    """Validated dev.gauntlet.authority-policy/v1 document."""

    schema_version: Literal["dev.gauntlet.authority-policy/v1"] = AUTHORITY_POLICY_SCHEMA
    default_ceiling: ActionClass = ActionClass.R1
    fail_closed: Literal[True] = True
    capabilities: dict[str, CapabilityRuleV1] = Field(min_length=1)


def default_authority_policy() -> AuthorityPolicyV1:
    """Build the strict default policy from ``constants.DEFAULT_CAPABILITIES``."""
    capabilities = {
        name: CapabilityRuleV1(action_class=ActionClass(klass), approval=_parse_approval(approval))
        for name, (klass, approval) in DEFAULT_CAPABILITIES.items()
    }
    return AuthorityPolicyV1(capabilities=capabilities)


def _parse_approval(raw: str | None) -> Approval | None:
    if raw is None:
        return None
    if raw in ("required", "human", "governance"):
        return cast(Approval, raw)
    raise InvalidInvocationError(f"unknown approval value in capability map: {raw!r}")


def load_authority_policy(document: Mapping[str, Any]) -> AuthorityPolicyV1:
    """Validate a raw policy document; any defect fails closed."""
    try:
        return AuthorityPolicyV1.model_validate(dict(document))
    except Exception as error:
        raise InvalidInvocationError(
            f"invalid authority policy document: {error}",
            hint="the authority policy fails closed; fix the document before retrying",
        ) from error


def policy_digest(policy: AuthorityPolicyV1) -> str:
    """Canonical digest binding decisions to the exact policy document."""
    return digest_value(policy.model_dump(mode="json"))


def resolve_effective_ceiling(
    policy: AuthorityPolicyV1,
    local_override: ActionClass | None,
    *,
    governance_decision: AuthorityDecisionV1 | None = None,
    governed_intent: ActionIntentV1 | None = None,
) -> ActionClass:
    """Resolve the effective automatic ceiling.

    A local override may lower the ceiling. Raising it requires a tracked R4
    governance decision: a committed AuthorityDecisionV1 whose intent used the
    ``change-authority-policy`` capability at R4.
    """
    if local_override is None:
        return policy.default_ceiling
    if ACTION_CLASS_ORDER[local_override] <= ACTION_CLASS_ORDER[policy.default_ceiling]:
        return local_override
    if governance_decision is None or governed_intent is None:
        raise ApprovalRequiredError(
            f"raising the ceiling from {policy.default_ceiling} to {local_override} "
            "requires a tracked R4 governance decision",
            hint="commit a change-authority-policy intent through the governance gate first",
        )
    if (
        governance_decision.outcome != "committed"
        or governed_intent.intent_id != governance_decision.intent_id
        or governed_intent.capability != GOVERNANCE_CAPABILITY
        or governed_intent.action_class is not ActionClass.R4
    ):
        raise ApprovalRequiredError(
            "the supplied governance decision does not authorize raising the ceiling",
            hint="the decision must be committed, for the same intent, "
            f"capability {GOVERNANCE_CAPABILITY!r} at R4",
        )
    return local_override


def capability_rule(policy: AuthorityPolicyV1, capability: str) -> CapabilityRuleV1:
    """Look up a capability; unknown capabilities fail closed."""
    rule = policy.capabilities.get(capability)
    if rule is None:
        raise InvalidInvocationError(
            f"unknown capability: {capability!r}",
            hint="the authority policy fails closed on unmapped capabilities",
        )
    return rule


def required_approval(
    policy: AuthorityPolicyV1, intent: ActionIntentV1, ceiling: ActionClass
) -> Approval | None:
    """The approval demanded by the capability rule and the automatic ceiling.

    The capability rule's own approval requirement always stands. When the
    rule requires no approval but the class exceeds the effective automatic
    ceiling (for example after a local lowering), automatic approval is no
    longer allowed and a human approval is required instead.
    """
    rule = capability_rule(policy, intent.capability)
    if intent.action_class is not rule.action_class:
        raise InvalidInvocationError(
            f"intent action class {intent.action_class} does not match the policy "
            f"class {rule.action_class} for capability {intent.capability!r}",
            hint="the authority policy fails closed on action-class mismatches",
        )
    requirement = rule.approval
    if (
        requirement is None
        and ACTION_CLASS_ORDER[intent.action_class] > ACTION_CLASS_ORDER[ceiling]
    ):
        requirement = "human"
    return requirement


# ---------------------------------------------------------------------------
# Voters
# ---------------------------------------------------------------------------


class Voter(Protocol):
    """Anything that can produce an immutable VoteV1 for an intent."""

    def vote(self, intent: ActionIntentV1) -> VoteV1: ...


class LlmSemanticAdvisor(Protocol):
    """Injected LLM interface: it may recommend or veto, never solely approve."""

    def assess(self, intent: ActionIntentV1) -> tuple[VoteDecision, str]: ...


class DeterministicPolicyVoter:
    """Mandatory voter: pure policy conformance, no judgment, no network."""

    VERSION = "deterministic-policy/1.0.0"

    def __init__(
        self,
        policy: AuthorityPolicyV1,
        *,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._policy = policy
        self._digest = policy_digest(policy)
        self._clock = clock
        self._ids = ids

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        decision = VoteDecision.APPROVE
        reason = "policy conformant"
        rule = self._policy.capabilities.get(intent.capability)
        if rule is None:
            decision = VoteDecision.REJECT
            reason = f"unknown capability {intent.capability!r} (fail closed)"
        elif intent.action_class is not rule.action_class:
            decision = VoteDecision.REJECT
            reason = (
                f"action class {intent.action_class} does not match policy class "
                f"{rule.action_class} for {intent.capability!r} (fail closed)"
            )
        elif intent.policy_digest != self._digest:
            decision = VoteDecision.REJECT
            reason = "intent was proposed against a stale policy digest"
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.DETERMINISTIC_POLICY,
            voter_version=self.VERSION,
            policy_digest=self._digest,
            decision=decision,
            reason=reason,
            created_at=self._clock.now(),
        )


class SpecScopeVoter:
    """Approves only intents whose write scopes stay inside permitted globs."""

    VERSION = "spec-scope/1.0.0"

    def __init__(
        self,
        permitted_write_globs: Sequence[str],
        *,
        policy_digest: str,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._globs = tuple(permitted_write_globs)
        self._digest = policy_digest
        self._clock = clock
        self._ids = ids

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        violations = [
            scope
            for scope in intent.write_scopes
            if not any(fnmatch(scope, pattern) for pattern in self._globs)
        ]
        if violations:
            decision = VoteDecision.REJECT
            reason = f"write scopes outside permitted globs: {', '.join(sorted(violations))}"
        else:
            decision = VoteDecision.APPROVE
            reason = "all write scopes fall inside the permitted globs"
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.SPEC_SCOPE,
            voter_version=self.VERSION,
            policy_digest=self._digest,
            decision=decision,
            reason=reason,
            created_at=self._clock.now(),
        )


class BudgetVoter:
    """Approves only intents that fit the injected budget check."""

    VERSION = "budget/1.0.0"

    def __init__(
        self,
        within_budget: Callable[[ActionIntentV1], tuple[bool, str]],
        *,
        policy_digest: str,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._within_budget = within_budget
        self._digest = policy_digest
        self._clock = clock
        self._ids = ids

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        ok, detail = self._within_budget(intent)
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.BUDGET,
            voter_version=self.VERSION,
            policy_digest=self._digest,
            decision=VoteDecision.APPROVE if ok else VoteDecision.REJECT,
            reason=detail,
            created_at=self._clock.now(),
        )


class EvaluatorPromotionVoter:
    """Hook for evaluator/promotion evidence; the hook supplies the verdict."""

    VERSION = "evaluator-promotion/1.0.0"

    def __init__(
        self,
        hook: Callable[[ActionIntentV1], tuple[VoteDecision, str, str | None]],
        *,
        policy_digest: str,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._hook = hook
        self._digest = policy_digest
        self._clock = clock
        self._ids = ids

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        decision, reason, evidence_digest = self._hook(intent)
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.EVALUATOR_PROMOTION,
            voter_version=self.VERSION,
            policy_digest=self._digest,
            evidence_digest=evidence_digest,
            decision=decision,
            reason=reason,
            created_at=self._clock.now(),
        )


class HumanApprovalVoter:
    """Records an explicit human decision captured outside this process."""

    VERSION = "human-approval/1.0.0"

    def __init__(
        self,
        approver: ActorRefV1,
        decision: VoteDecision,
        reason: str,
        *,
        policy_digest: str,
        clock: Clock,
        ids: IdGenerator,
        expires_at: str | None = None,
    ) -> None:
        if approver.kind != "human":
            raise InvalidInvocationError(
                f"human approval voter requires a human actor, got {approver.kind!r}"
            )
        self._approver = approver
        self._decision = decision
        self._reason = reason
        self._digest = policy_digest
        self._clock = clock
        self._ids = ids
        self._expires_at = expires_at

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.HUMAN_APPROVAL,
            voter_version=f"{self.VERSION};approver={self._approver.actor_id}",
            policy_digest=self._digest,
            decision=self._decision,
            reason=self._reason,
            expires_at=self._expires_at,
            created_at=self._clock.now(),
        )


class LlmSemanticVoter:
    """Optional advisory voter; structurally never a sole approval for R3/R4."""

    VERSION = "llm-semantic/1.0.0"

    def __init__(
        self,
        advisor: LlmSemanticAdvisor,
        *,
        policy_digest: str,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._advisor = advisor
        self._digest = policy_digest
        self._clock = clock
        self._ids = ids

    def vote(self, intent: ActionIntentV1) -> VoteV1:
        decision, reason = self._advisor.assess(intent)
        return VoteV1(
            vote_id=self._ids.new_id("vote"),
            intent_id=intent.intent_id,
            voter_kind=VoterKind.LLM_SEMANTIC,
            voter_version=self.VERSION,
            policy_digest=self._digest,
            decision=decision,
            reason=reason,
            created_at=self._clock.now(),
        )


# ---------------------------------------------------------------------------
# Decision assembly
# ---------------------------------------------------------------------------

# Voter kinds whose approve vote can satisfy a plain "required" approval.
_REQUIRED_APPROVAL_KINDS = frozenset(
    {
        VoterKind.SPEC_SCOPE,
        VoterKind.BUDGET,
        VoterKind.EVALUATOR_PROMOTION,
        VoterKind.HUMAN_APPROVAL,
        VoterKind.LLM_SEMANTIC,
    }
)


class AuthorityEngine:
    """Assembles an AuthorityDecisionV1 from votes under the quorum rules."""

    def __init__(
        self,
        policy: AuthorityPolicyV1,
        *,
        clock: Clock,
        ids: IdGenerator,
        effective_ceiling: ActionClass | None = None,
    ) -> None:
        self._policy = policy
        self._digest = policy_digest(policy)
        self._clock = clock
        self._ids = ids
        self._ceiling = effective_ceiling or policy.default_ceiling

    @property
    def current_policy_digest(self) -> str:
        return self._digest

    def decide(
        self,
        intent: ActionIntentV1,
        votes: Sequence[VoteV1],
        *,
        governance_decision_id: str | None = None,
    ) -> AuthorityDecisionV1:
        """Apply the quorum rules and assemble an immutable decision record.

        Quorum:

        - the deterministic policy voter is mandatory and must approve;
        - any live reject vote vetoes;
        - within the ceiling with no approval requirement, the deterministic
          voter alone approves (R0/R1 by default policy);
        - ``required`` needs one further approval from any non-deterministic
          voter; ``human`` needs a human approval vote; ``governance`` needs a
          human approval vote plus a tracked governance decision reference;
        - LLM votes never count toward the human/governance quorum.
        """
        live_votes = [vote for vote in votes if not self._expired(vote)]
        outcome: Literal["committed", "aborted"]
        try:
            requirement = required_approval(self._policy, intent, self._ceiling)
        except InvalidInvocationError as error:
            return self._assemble(intent, list(votes), "aborted", error.message)

        deterministic = [
            vote for vote in live_votes if vote.voter_kind is VoterKind.DETERMINISTIC_POLICY
        ]
        rejections = [vote for vote in live_votes if vote.decision is VoteDecision.REJECT]
        if rejections:
            outcome, reason = "aborted", self._describe(rejections, "rejected by")
        elif not deterministic or any(
            vote.decision is not VoteDecision.APPROVE for vote in deterministic
        ):
            outcome, reason = "aborted", "the mandatory deterministic policy voter did not approve"
        else:
            outcome, reason = self._apply_requirement(
                requirement, live_votes, governance_decision_id
            )
        return self._assemble(intent, list(votes), outcome, reason)

    def _apply_requirement(
        self,
        requirement: Approval | None,
        live_votes: Sequence[VoteV1],
        governance_decision_id: str | None,
    ) -> tuple[Literal["committed", "aborted"], str]:
        approvals = [vote for vote in live_votes if vote.decision is VoteDecision.APPROVE]
        if requirement is None:
            return "committed", "within the automatic ceiling; deterministic approval suffices"
        if requirement == "required":
            if any(vote.voter_kind in _REQUIRED_APPROVAL_KINDS for vote in approvals):
                return "committed", "policy approval requirement satisfied"
            return "aborted", "approval required by policy but no approving voter present"
        # human and governance: LLM votes are structurally excluded here.
        human_approvals = [
            vote for vote in approvals if vote.voter_kind is VoterKind.HUMAN_APPROVAL
        ]
        if not human_approvals:
            return (
                "aborted",
                f"{requirement} approval required but no human approval vote present "
                "(LLM votes never satisfy this quorum)",
            )
        if requirement == "human":
            return "committed", "human approval quorum satisfied"
        if governance_decision_id is None:
            return "aborted", "governance approval required but no tracked governance decision"
        return (
            "committed",
            f"governance quorum satisfied via tracked decision {governance_decision_id}",
        )

    def _expired(self, vote: VoteV1) -> bool:
        return vote.expires_at is not None and vote.expires_at <= self._clock.now()

    @staticmethod
    def _describe(votes: Iterable[VoteV1], prefix: str) -> str:
        kinds = ", ".join(sorted({vote.voter_kind.value for vote in votes}))
        return f"{prefix} {kinds}"

    def _assemble(
        self,
        intent: ActionIntentV1,
        votes: list[VoteV1],
        outcome: Literal["committed", "aborted"],
        reason: str,
    ) -> AuthorityDecisionV1:
        return AuthorityDecisionV1(
            decision_id=self._ids.new_id("decision"),
            intent_id=intent.intent_id,
            outcome=outcome,
            votes=votes,
            policy_digest=self._digest,
            reason=reason,
            decided_at=self._clock.now(),
        )
