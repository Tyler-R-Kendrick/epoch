"""Write-ahead intent service: the durable authority state machine.

Every intent transition appends an immutable snapshot record to the ledger
(kind ``decisions``) and emits a graph event through the injected
:class:`EventEmitter`. Nothing is ever rewritten: a correction appends a new
record. Legality is enforced against ``constants.INTENT_TRANSITIONS``.

Snapshot record ids are ``<intent_id>.<seq>.<state>`` so that history is
naturally ordered and each write lands in a fresh, immutable ledger file.
"""

from __future__ import annotations

from typing import Any, Protocol

from gauntlet.constants import INTENT_TRANSITIONS, IntentState
from gauntlet.errors import GateFailedError, InvalidInvocationError
from gauntlet.ledger import LedgerStore
from gauntlet.models import ActionIntentV1, AuthorityDecisionV1, VoteV1
from gauntlet.support import Clock

LEDGER_KIND = "decisions"


class EventEmitter(Protocol):
    """Narrow seam to the graph/event plane owned by another module."""

    def emit(self, type: str, payload: dict[str, Any]) -> str: ...


class EvidenceGate(Protocol):
    """Consulted before commit; beliefs.py provides the real implementation."""

    def evidence_valid(self, intent: ActionIntentV1) -> tuple[bool, list[str]]: ...


def _snapshot_id(intent_id: str, seq: int, state: IntentState) -> str:
    # The ".state." segment keeps intent snapshots disjoint from the
    # ".effect."/".plan."/".compensation." records the executor appends
    # under the same intent id prefix.
    return f"{intent_id}.state.{seq:04d}.{state.value}"


class IntentService:
    """Append-only write-ahead intent log over the immutable ledger."""

    def __init__(
        self,
        ledger: LedgerStore,
        *,
        clock: Clock,
        emitter: EventEmitter,
        evidence_gate: EvidenceGate | None = None,
    ) -> None:
        self._ledger = ledger
        self._clock = clock
        self._emitter = emitter
        self._evidence_gate = evidence_gate

    # -- durable state ------------------------------------------------------

    def _history_ids(self, intent_id: str) -> list[str]:
        prefix = f"{intent_id}.state."
        return sorted(
            record_id
            for record_id in self._ledger.list_ids(LEDGER_KIND)
            if record_id.startswith(prefix)
        )

    def current(self, intent_id: str) -> ActionIntentV1:
        """Latest durable snapshot; recoverable after a crash by rescanning."""
        history = self._history_ids(intent_id)
        if not history:
            raise InvalidInvocationError(f"unknown intent: {intent_id}")
        return self._ledger.load(LEDGER_KIND, history[-1], ActionIntentV1)

    def history(self, intent_id: str) -> list[ActionIntentV1]:
        return [
            self._ledger.load(LEDGER_KIND, record_id, ActionIntentV1)
            for record_id in self._history_ids(intent_id)
        ]

    def _append_snapshot(self, intent: ActionIntentV1) -> ActionIntentV1:
        seq = len(self._history_ids(intent.intent_id))
        self._ledger.append(LEDGER_KIND, _snapshot_id(intent.intent_id, seq, intent.state), intent)
        return intent

    def _transition(self, intent_id: str, new_state: IntentState) -> ActionIntentV1:
        current = self.current(intent_id)
        allowed = INTENT_TRANSITIONS[current.state]
        if new_state not in allowed:
            raise InvalidInvocationError(
                f"illegal intent transition {current.state.value} -> {new_state.value}",
                hint=f"legal successors: {', '.join(sorted(s.value for s in allowed)) or 'none'}",
            )
        return self._append_snapshot(current.model_copy(update={"state": new_state}))

    # -- lifecycle ----------------------------------------------------------

    def propose(self, intent: ActionIntentV1) -> ActionIntentV1:
        """Persist the intent durably before any voting or effect."""
        if intent.state is not IntentState.PROPOSED:
            raise InvalidInvocationError(
                f"an intent must be proposed in state 'proposed', got {intent.state.value!r}"
            )
        if self._history_ids(intent.intent_id):
            raise InvalidInvocationError(f"intent already proposed: {intent.intent_id}")
        self._append_snapshot(intent)
        self._emitter.emit(
            "dev.gauntlet.intent.proposed.v1",
            {"intent_id": intent.intent_id, "capability": intent.capability},
        )
        return intent

    def begin_voting(self, intent_id: str) -> ActionIntentV1:
        return self._transition(intent_id, IntentState.VOTING)

    def record_vote(self, vote: VoteV1) -> VoteV1:
        """Persist an immutable vote; requires the intent to be in voting."""
        current = self.current(vote.intent_id)
        if current.state is not IntentState.VOTING:
            raise InvalidInvocationError(
                f"votes are only recorded while voting; intent is {current.state.value!r}"
            )
        self._ledger.append(LEDGER_KIND, vote.vote_id, vote)
        return vote

    def apply_decision(
        self,
        intent_id: str,
        decision: AuthorityDecisionV1,
        *,
        current_policy_digest: str,
        current_spec_digest: str | None = None,
    ) -> ActionIntentV1:
        """Persist the decision, then commit or abort the intent.

        A stale intent — one whose policy or spec digest no longer matches the
        current digests — refuses to commit even with an approving decision.
        """
        if decision.intent_id != intent_id:
            raise InvalidInvocationError(
                f"decision {decision.decision_id} targets {decision.intent_id}, not {intent_id}"
            )
        self._ledger.append(LEDGER_KIND, decision.decision_id, decision)
        if decision.outcome == "aborted":
            return self.abort(intent_id, reason=decision.reason)
        current = self.current(intent_id)
        self._require_fresh(current, current_policy_digest, current_spec_digest)
        if self._evidence_gate is not None:
            valid, problems = self._evidence_gate.evidence_valid(current)
            if not valid:
                raise GateFailedError(
                    f"intent evidence is no longer valid: {'; '.join(problems)}",
                    hint="revoked or quarantined evidence blocks commitment",
                )
        committed = self._transition(intent_id, IntentState.COMMITTED)
        self._emitter.emit(
            "dev.gauntlet.intent.committed.v1",
            {"intent_id": intent_id, "decision_id": decision.decision_id},
        )
        return committed

    def abort(self, intent_id: str, *, reason: str) -> ActionIntentV1:
        aborted = self._transition(intent_id, IntentState.ABORTED)
        self._emitter.emit(
            "dev.gauntlet.intent.aborted.v1", {"intent_id": intent_id, "reason": reason}
        )
        return aborted

    def mark_executing(
        self,
        intent_id: str,
        *,
        current_policy_digest: str,
        current_spec_digest: str | None = None,
    ) -> ActionIntentV1:
        """Enter executing; stale intents refuse to execute."""
        current = self.current(intent_id)
        self._require_fresh(current, current_policy_digest, current_spec_digest)
        executing = self._transition(intent_id, IntentState.EXECUTING)
        self._emitter.emit(
            "dev.gauntlet.effect.started.v1",
            {"intent_id": intent_id, "started_at": self._clock.now()},
        )
        return executing

    def settle(self, intent_id: str, outcome: IntentState) -> ActionIntentV1:
        """Record the terminal (or reconcilable) outcome of an execution."""
        event_type = {
            IntentState.COMPLETED: "dev.gauntlet.effect.completed.v1",
            IntentState.FAILED_BEFORE_EFFECT: "dev.gauntlet.effect.failed.v1",
            IntentState.FAILED_AFTER_EFFECT: "dev.gauntlet.effect.failed.v1",
            IntentState.OUTCOME_UNKNOWN: "dev.gauntlet.effect.unknown.v1",
            IntentState.COMPENSATED: "dev.gauntlet.effect.compensated.v1",
            IntentState.COMPENSATION_FAILED: "dev.gauntlet.effect.failed.v1",
            IntentState.RECONCILED: "dev.gauntlet.effect.completed.v1",
        }.get(outcome)
        if event_type is None:
            raise InvalidInvocationError(f"{outcome.value!r} is not a settlement outcome")
        settled = self._transition(intent_id, outcome)
        self._emitter.emit(event_type, {"intent_id": intent_id, "state": outcome.value})
        return settled

    # -- staleness ----------------------------------------------------------

    @staticmethod
    def _require_fresh(
        intent: ActionIntentV1,
        current_policy_digest: str,
        current_spec_digest: str | None,
    ) -> None:
        if intent.policy_digest != current_policy_digest:
            raise GateFailedError(
                f"stale intent {intent.intent_id}: the authority policy digest changed",
                hint="re-propose the intent against the current policy",
            )
        if (
            intent.spec_digest is not None
            and current_spec_digest is not None
            and intent.spec_digest != current_spec_digest
        ):
            raise GateFailedError(
                f"stale intent {intent.intent_id}: the spec digest changed",
                hint="re-propose the intent against the current frozen spec",
            )
