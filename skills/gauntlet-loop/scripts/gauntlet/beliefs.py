"""Belief transactions: epistemic state with append-only history.

Rules from the brief:

- raw traces and evaluator outputs create observations, never beliefs;
- a diagnosis starts tentative; only deterministic confirmation, independent
  corroboration, or a controlled experiment validates it;
- only evidence satisfying the relevant action policy becomes ``action_safe``
  (fail closed);
- corrections append ``superseded``/``revoked`` events — the original record
  is never rewritten;
- revoking a belief cascades: every dependent diagnosis/intervention/
  experiment/promotion/release/handoff is computed, unresolved downstream
  decisions are flagged for review, pending intents lose their evidence
  (consulted through the :class:`~gauntlet.intents.EvidenceGate` protocol),
  an incident is created when a released artifact depended materially on the
  revoked belief, and compensation is PROPOSED, never executed.
"""

from __future__ import annotations

from typing import Annotated, Literal, Protocol

from pydantic import Field

from gauntlet.constants import BELIEF_TRANSITIONS, BeliefState
from gauntlet.errors import GateFailedError, InvalidInvocationError
from gauntlet.ledger import LedgerStore
from gauntlet.models import (
    ActionIntentV1,
    BeliefV1,
    GauntletModel,
    NonEmptyStr,
    ObservationV1,
    StableId,
    UtcTimestamp,
)
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, IdGenerator

LEDGER_KIND = "decisions"
INCIDENT_KIND = "incidents"

DEPENDENT_KINDS = frozenset(
    {
        "diagnosis",
        "intervention",
        "experiment",
        "promotion",
        "release",
        "handoff",
        "skill-rule",
        "intent",
    }
)

# Belief states that no longer support action or commitment.
INVALID_EVIDENCE_STATES = frozenset(
    {BeliefState.QUARANTINED, BeliefState.REVOKED, BeliefState.SUPERSEDED}
)


class EventEmitter(Protocol):
    """Same narrow seam as intents.py; wired by the coordinator."""

    def emit(self, type: str, payload: dict[str, object]) -> str: ...


class ActionEvidencePolicy(Protocol):
    """Decides whether a belief's evidence satisfies the action policy."""

    def satisfies_action_policy(self, belief: BeliefV1) -> tuple[bool, str]: ...


class DependentEdgeV1(GauntletModel):
    """A registered downstream dependent of a belief."""

    schema_version: Literal["dev.gauntlet.belief-dependent/v1"] = "dev.gauntlet.belief-dependent/v1"
    edge_id: StableId
    belief_id: StableId
    dependent_kind: NonEmptyStr
    dependent_id: StableId
    material: bool = True
    created_at: UtcTimestamp


class ReviewFlagV1(GauntletModel):
    """Marks an unresolved downstream decision as needing review."""

    schema_version: Literal["dev.gauntlet.review-flag/v1"] = "dev.gauntlet.review-flag/v1"
    flag_id: StableId
    revoked_belief_id: StableId
    subject_kind: NonEmptyStr
    subject_id: StableId
    reason: NonEmptyStr
    created_at: UtcTimestamp


class BeliefIncidentV1(GauntletModel):
    """A released artifact depended materially on a revoked belief."""

    schema_version: Literal["dev.gauntlet.belief-incident/v1"] = "dev.gauntlet.belief-incident/v1"
    incident_id: StableId
    revoked_belief_id: StableId
    release_ids: Annotated[list[StableId], Field(min_length=1)]
    reason: NonEmptyStr
    created_at: UtcTimestamp


class CompensationProposalV1(GauntletModel):
    """A proposed (never executed) compensation for a revocation impact."""

    schema_version: Literal["dev.gauntlet.compensation-proposal/v1"] = (
        "dev.gauntlet.compensation-proposal/v1"
    )
    proposal_id: StableId
    revoked_belief_id: StableId
    subject_kind: NonEmptyStr
    subject_id: StableId
    proposed_action: NonEmptyStr
    executed: Literal[False] = False
    created_at: UtcTimestamp


class RevocationImpactV1(GauntletModel):
    """Complete computed impact of one belief revocation."""

    schema_version: Literal["dev.gauntlet.revocation-impact/v1"] = (
        "dev.gauntlet.revocation-impact/v1"
    )
    impact_id: StableId
    revoked_belief_id: StableId
    dependent_belief_ids: list[StableId] = Field(default_factory=list)
    flagged: list[ReviewFlagV1] = Field(default_factory=list)
    blocked_intent_ids: list[StableId] = Field(default_factory=list)
    incident_ids: list[StableId] = Field(default_factory=list)
    proposal_ids: list[StableId] = Field(default_factory=list)
    created_at: UtcTimestamp


def _snapshot_id(belief_id: str, seq: int, state: BeliefState) -> str:
    return f"{belief_id}.{seq:04d}.{state.value}"


class BeliefService:
    """Append-only belief ledger with dependency tracking and revocation."""

    def __init__(
        self,
        ledger: LedgerStore,
        *,
        clock: Clock,
        ids: IdGenerator,
        emitter: EventEmitter,
        evidence_policy: ActionEvidencePolicy | None = None,
        redactor: Redactor | None = None,
    ) -> None:
        self._ledger = ledger
        self._clock = clock
        self._ids = ids
        self._emitter = emitter
        self._evidence_policy = evidence_policy
        self._redactor = redactor or Redactor()

    # -- observations ---------------------------------------------------------

    def record_observation(self, observation: ObservationV1) -> ObservationV1:
        """Persist raw evidence. Observations never create beliefs."""
        values, report = self._redactor.redact_value(observation.values)
        redacted = observation.model_copy(
            update={
                "values": values,
                "redaction_report": [*observation.redaction_report, *report],
            }
        )
        self._ledger.append(LEDGER_KIND, redacted.observation_id, redacted)
        self._emitter.emit(
            "dev.gauntlet.observation.recorded.v1",
            {"observation_id": redacted.observation_id},
        )
        return redacted

    # -- belief lifecycle -------------------------------------------------------

    def _history_ids(self, belief_id: str) -> list[str]:
        prefix = f"{belief_id}."
        return sorted(rid for rid in self._ledger.list_ids(LEDGER_KIND) if rid.startswith(prefix))

    def current(self, belief_id: str) -> BeliefV1:
        history = self._history_ids(belief_id)
        if not history:
            raise InvalidInvocationError(f"unknown belief: {belief_id}")
        return self._ledger.load(LEDGER_KIND, history[-1], BeliefV1)

    def history(self, belief_id: str) -> list[BeliefV1]:
        return [
            self._ledger.load(LEDGER_KIND, rid, BeliefV1) for rid in self._history_ids(belief_id)
        ]

    def _append_snapshot(self, belief: BeliefV1) -> BeliefV1:
        seq = len(self._history_ids(belief.belief_id))
        self._ledger.append(LEDGER_KIND, _snapshot_id(belief.belief_id, seq, belief.state), belief)
        return belief

    def create_belief(
        self,
        statement: str,
        *,
        depends_on_observations: list[str] | None = None,
        depends_on_beliefs: list[str] | None = None,
        supports: list[str] | None = None,
        contradicts: list[str] | None = None,
        confidence: float | None = None,
    ) -> BeliefV1:
        """A new belief starts raw; it earns every later state."""
        belief = BeliefV1(
            belief_id=self._ids.new_id("belief"),
            statement=statement,
            state=BeliefState.RAW,
            depends_on_observations=depends_on_observations or [],
            depends_on_beliefs=depends_on_beliefs or [],
            supports=supports or [],
            contradicts=contradicts or [],
            confidence=confidence,
            created_at=self._clock.now(),
        )
        return self._append_snapshot(belief)

    def propose_diagnosis(
        self,
        statement: str,
        *,
        depends_on_observations: list[str] | None = None,
        depends_on_beliefs: list[str] | None = None,
        confidence: float | None = None,
    ) -> BeliefV1:
        """A diagnosis starts tentative (raw -> tentative, both appended)."""
        belief = self.create_belief(
            statement,
            depends_on_observations=depends_on_observations,
            depends_on_beliefs=depends_on_beliefs,
            confidence=confidence,
        )
        return self.transition(belief.belief_id, BeliefState.TENTATIVE)

    def transition(self, belief_id: str, new_state: BeliefState) -> BeliefV1:
        current = self.current(belief_id)
        allowed = BELIEF_TRANSITIONS[current.state]
        if new_state not in allowed:
            raise InvalidInvocationError(
                f"illegal belief transition {current.state.value} -> {new_state.value}",
                hint=f"legal successors: {', '.join(sorted(s.value for s in allowed)) or 'none'}",
            )
        if new_state is BeliefState.ACTION_SAFE:
            if self._evidence_policy is None:
                raise GateFailedError(
                    "no action evidence policy is configured; action_safe fails closed",
                    hint="inject an ActionEvidencePolicy before marking beliefs action_safe",
                )
            ok, detail = self._evidence_policy.satisfies_action_policy(current)
            if not ok:
                raise GateFailedError(
                    f"evidence for {belief_id} does not satisfy the action policy: {detail}"
                )
        updated = current.model_copy(update={"state": new_state, "updated_at": self._clock.now()})
        self._append_snapshot(updated)
        if new_state is BeliefState.VALIDATED:
            self._emitter.emit("dev.gauntlet.belief.validated.v1", {"belief_id": belief_id})
        return updated

    # -- dependents --------------------------------------------------------------

    def register_dependent(
        self, belief_id: str, dependent_kind: str, dependent_id: str, *, material: bool = True
    ) -> DependentEdgeV1:
        """Record that a downstream decision depends on this belief."""
        if dependent_kind not in DEPENDENT_KINDS:
            raise InvalidInvocationError(
                f"unknown dependent kind: {dependent_kind!r}",
                hint=f"expected one of {', '.join(sorted(DEPENDENT_KINDS))}",
            )
        self.current(belief_id)  # fail closed on unknown beliefs
        edge = DependentEdgeV1(
            edge_id=self._ids.new_id("belief-edge"),
            belief_id=belief_id,
            dependent_kind=dependent_kind,
            dependent_id=dependent_id,
            material=material,
            created_at=self._clock.now(),
        )
        self._ledger.append(LEDGER_KIND, edge.edge_id, edge)
        return edge

    def _all_edges(self) -> list[DependentEdgeV1]:
        return [
            self._ledger.load(LEDGER_KIND, rid, DependentEdgeV1)
            for rid in self._ledger.list_ids(LEDGER_KIND)
            if rid.startswith("belief-edge:")
        ]

    def _belief_ids(self) -> list[str]:
        seen: set[str] = set()
        for rid in self._ledger.list_ids(LEDGER_KIND):
            if rid.startswith("belief:"):
                seen.add(rid.rsplit(".", 2)[0])
        return sorted(seen)

    def _dependent_beliefs(self, root_id: str) -> list[str]:
        """Transitive closure of beliefs depending on ``root_id``."""
        beliefs = {belief_id: self.current(belief_id) for belief_id in self._belief_ids()}
        dependents: set[str] = set()
        frontier = {root_id}
        while frontier:
            next_frontier: set[str] = set()
            for belief_id, belief in beliefs.items():
                if belief_id in dependents or belief_id == root_id:
                    continue
                if frontier & set(belief.depends_on_beliefs):
                    dependents.add(belief_id)
                    next_frontier.add(belief_id)
            frontier = next_frontier
        return sorted(dependents)

    # -- revocation cascade ---------------------------------------------------------

    def revoke(self, belief_id: str, *, reason: str) -> RevocationImpactV1:
        """Revoke a belief and compute the complete downstream impact.

        History is preserved: every effect of the cascade is an appended
        record. Compensation is proposed, never executed here.
        """
        self.transition(belief_id, BeliefState.REVOKED)
        self._emitter.emit(
            "dev.gauntlet.belief.revoked.v1", {"belief_id": belief_id, "reason": reason}
        )
        dependent_beliefs = self._dependent_beliefs(belief_id)
        for dependent_id in dependent_beliefs:
            dependent = self.current(dependent_id)
            if BeliefState.QUARANTINED in BELIEF_TRANSITIONS[dependent.state]:
                self.transition(dependent_id, BeliefState.QUARANTINED)

        affected = {belief_id, *dependent_beliefs}
        flagged: list[ReviewFlagV1] = []
        blocked_intents: list[str] = []
        release_ids: list[str] = []
        proposal_ids: list[str] = []
        for edge in self._all_edges():
            if edge.belief_id not in affected:
                continue
            if edge.dependent_kind == "intent":
                blocked_intents.append(edge.dependent_id)
            flag = ReviewFlagV1(
                flag_id=self._ids.new_id("review-flag"),
                revoked_belief_id=belief_id,
                subject_kind=edge.dependent_kind,
                subject_id=edge.dependent_id,
                reason=f"depends on revoked belief {belief_id}: {reason}",
                created_at=self._clock.now(),
            )
            self._ledger.append(LEDGER_KIND, flag.flag_id, flag)
            flagged.append(flag)
            if edge.dependent_kind == "release" and edge.material:
                release_ids.append(edge.dependent_id)
            if edge.dependent_kind in ("release", "promotion") and edge.material:
                proposal = CompensationProposalV1(
                    proposal_id=self._ids.new_id("compensation-proposal"),
                    revoked_belief_id=belief_id,
                    subject_kind=edge.dependent_kind,
                    subject_id=edge.dependent_id,
                    proposed_action=(
                        f"review and, with authority, roll back {edge.dependent_kind} "
                        f"{edge.dependent_id}"
                    ),
                    created_at=self._clock.now(),
                )
                self._ledger.append(LEDGER_KIND, proposal.proposal_id, proposal)
                proposal_ids.append(proposal.proposal_id)

        incident_ids: list[str] = []
        if release_ids:
            incident = BeliefIncidentV1(
                incident_id=self._ids.new_id("incident"),
                revoked_belief_id=belief_id,
                release_ids=sorted(set(release_ids)),
                reason=f"released artifact depended materially on revoked belief: {reason}",
                created_at=self._clock.now(),
            )
            self._ledger.append(INCIDENT_KIND, incident.incident_id, incident)
            incident_ids.append(incident.incident_id)

        impact = RevocationImpactV1(
            impact_id=self._ids.new_id("revocation-impact"),
            revoked_belief_id=belief_id,
            dependent_belief_ids=dependent_beliefs,
            flagged=flagged,
            blocked_intent_ids=sorted(set(blocked_intents)),
            incident_ids=incident_ids,
            proposal_ids=proposal_ids,
            created_at=self._clock.now(),
        )
        self._ledger.append(LEDGER_KIND, impact.impact_id, impact)
        return impact

    # -- evidence gate (consulted by the intent service) --------------------------

    def evidence_valid(self, intent: ActionIntentV1) -> tuple[bool, list[str]]:
        """EvidenceGate implementation for :class:`gauntlet.intents.IntentService`.

        Fails closed: a missing belief is as blocking as a revoked one.
        """
        problems: list[str] = []
        for ref in intent.causal_refs:
            if ref.kind != "belief":
                continue
            try:
                belief = self.current(ref.ref_id)
            except InvalidInvocationError:
                problems.append(f"belief {ref.ref_id} is unknown (fail closed)")
                continue
            if belief.state in INVALID_EVIDENCE_STATES:
                problems.append(f"belief {ref.ref_id} is {belief.state.value}")
        return (not problems, problems)
