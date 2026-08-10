"""Shared deterministic factories for the authority/effect/belief test suites."""

from __future__ import annotations

from typing import Any

from gauntlet.authority import default_authority_policy, policy_digest
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ActionClass, EffectClass, IntentState
from gauntlet.ledger import LedgerStore
from gauntlet.models import ActionIntentV1, ActorRefV1, EvidenceRefV1
from gauntlet.support import Clock, IdGenerator

POLICY = default_authority_policy()
POLICY_DIGEST = policy_digest(POLICY)
SPEC_DIGEST = digest_value({"spec": "frozen"})


class RecordingEmitter:
    """EventEmitter test double recording every (type, payload) pair."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, Any]]] = []

    def emit(self, type: str, payload: dict[str, Any]) -> str:
        self.events.append((type, payload))
        return f"event:{len(self.events):06d}"

    def types(self) -> list[str]:
        return [event_type for event_type, _ in self.events]


class NoFailedPreconditions:
    def failed_preconditions(self, intent: ActionIntentV1) -> list[str]:
        return []


class FailingPreconditions:
    def __init__(self, failures: list[str]) -> None:
        self._failures = failures

    def failed_preconditions(self, intent: ActionIntentV1) -> list[str]:
        return list(self._failures)


def make_actor(kind: str = "agent") -> ActorRefV1:
    return ActorRefV1(actor_id=f"{kind}-1", kind=kind)  # type: ignore[arg-type]


def make_intent(
    ids: IdGenerator,
    clock: Clock,
    *,
    capability: str = "write-gauntlet-state",
    action_class: ActionClass = ActionClass.R1,
    effect_class: EffectClass = EffectClass.REVERSIBLE,
    policy_digest_value: str = POLICY_DIGEST,
    spec_digest: str | None = None,
    idempotency_key: str | None = None,
    reconciliation_strategy: str | None = None,
    causal_refs: list[EvidenceRefV1] | None = None,
    write_scopes: list[str] | None = None,
) -> ActionIntentV1:
    return ActionIntentV1(
        intent_id=ids.new_id("intent"),
        project_id="proj-1",
        correlation_id="corr-1",
        causal_refs=causal_refs or [],
        actor=make_actor(),
        operation="test-operation",
        capability=capability,
        input_digest=digest_value({"input": capability}),
        write_scopes=write_scopes or [],
        action_class=action_class,
        effect_class=effect_class,
        idempotency_key=idempotency_key,
        reconciliation_strategy=reconciliation_strategy,
        spec_digest=spec_digest,
        policy_digest=policy_digest_value,
        created_at=clock.now(),
    )


def seed_intent_state(
    ledger: LedgerStore, intent: ActionIntentV1, state: IntentState, *, seq: int = 0
) -> ActionIntentV1:
    """Append a snapshot record directly, placing the intent in ``state``."""
    snapshot = intent.model_copy(update={"state": state})
    ledger.append("decisions", f"{intent.intent_id}.state.{seq:04d}.{state.value}", snapshot)
    return snapshot
