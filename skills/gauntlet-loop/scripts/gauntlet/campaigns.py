"""Durable campaign service: start, resume, checkpoint, status, stop.

Persistence model: campaign state lives in the append-only control ledger
(kind ``campaigns``). Because ledger records are immutable, every state
transition appends a new *revision* record (``<campaign-id>.rev-<n>``);
``load`` returns the highest revision. Handoffs are written both to
``.gauntlet/handoffs/`` (human/agent-readable checkpoint files) and to the
ledger for portability, always after redaction.

Authority wiring: this module defines narrow ``EventEmitter`` and
``IntentGate`` protocols and takes them by constructor injection. The
defaults (``RecordingEventEmitter``, ``NullIntentGate``) are for tests and
library use; the CLI wires the real authority/event services from
``gauntlet.authority``/``gauntlet.intents`` at composition time.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

from gauntlet.canonical_json import canonical_bytes
from gauntlet.constants import ACTION_CLASS_ORDER, ActionClass, CampaignState, StopReason
from gauntlet.errors import (
    ApprovalRequiredError,
    GateFailedError,
    InvalidInvocationError,
)
from gauntlet.gitops import GitRunner
from gauntlet.ledger import LedgerStore
from gauntlet.models import BudgetV1, CampaignV1, GitRefV1, HandoffV1, StopPolicyV1
from gauntlet.paths import ProjectPaths, atomic_write
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, IdGenerator

_REVISION_SEPARATOR = ".rev-"


class EventEmitter(Protocol):
    """Narrow event seam; the real graph event layer implements this."""

    def emit(self, type: str, payload: Mapping[str, object]) -> str:
        """Persist an event and return its event id."""
        ...


@dataclass
class RecordingEventEmitter:
    """Default in-memory emitter for tests and library composition."""

    events: list[tuple[str, dict[str, object]]] = field(default_factory=list)

    def emit(self, type: str, payload: Mapping[str, object]) -> str:
        self.events.append((type, dict(payload)))
        return f"event:{len(self.events):06d}"


class IntentGate(Protocol):
    """Write-ahead authority seam: block until an intent is committed."""

    def require_committed(self, capability: str, *, action_class: ActionClass, detail: str) -> None:
        """Raise unless a committed intent authorizes ``capability``."""
        ...


@dataclass
class NullIntentGate:
    """Permissive default: allows R0/R1, refuses R2+ with approval-required.

    The CLI replaces this with the real authority service; tests use it to
    prove that costly capabilities cannot run without a committed intent.
    """

    def require_committed(self, capability: str, *, action_class: ActionClass, detail: str) -> None:
        if ACTION_CLASS_ORDER[action_class] >= ACTION_CLASS_ORDER[ActionClass.R2]:
            raise ApprovalRequiredError(
                f"capability {capability!r} ({action_class}) requires a committed intent: {detail}",
                hint="propose and approve the intent, then retry",
            )


@dataclass(frozen=True)
class BudgetUsage:
    """Observed campaign resource counters, provided by the caller."""

    experiments: int = 0
    wall_clock_seconds: int = 0
    evaluator_runs: int = 0
    cost_usd: float = 0.0


def budget_overruns(budget: BudgetV1, usage: BudgetUsage) -> list[str]:
    """Human-readable overruns of the hard budget; empty means within budget."""
    overruns: list[str] = []
    if budget.max_experiments is not None and usage.experiments >= budget.max_experiments:
        overruns.append(f"experiments {usage.experiments}/{budget.max_experiments}")
    if (
        budget.max_wall_clock_seconds is not None
        and usage.wall_clock_seconds >= budget.max_wall_clock_seconds
    ):
        overruns.append(f"wall-clock {usage.wall_clock_seconds}s/{budget.max_wall_clock_seconds}s")
    if budget.max_evaluator_runs is not None and usage.evaluator_runs >= budget.max_evaluator_runs:
        overruns.append(f"evaluator-runs {usage.evaluator_runs}/{budget.max_evaluator_runs}")
    if budget.max_cost_usd is not None and usage.cost_usd >= budget.max_cost_usd:
        overruns.append(f"cost ${usage.cost_usd}/${budget.max_cost_usd}")
    return overruns


@dataclass(frozen=True)
class StopSignals:
    """Inputs for stop-condition evaluation, injected by callers/providers."""

    usage: BudgetUsage = field(default_factory=BudgetUsage)
    target_condition_met: bool = False
    recent_target_deltas: tuple[float, ...] = ()
    evaluator_disagreement: float | None = None
    unresolved_critical_counterexamples: int = 0


@dataclass(frozen=True)
class CampaignStatus:
    campaign: CampaignV1
    triggered: tuple[StopReason, ...]
    details: tuple[str, ...]

    @property
    def should_stop(self) -> bool:
        return bool(self.triggered)


def evaluate_stop_policy(policy: StopPolicyV1, signals: StopSignals) -> CampaignStatusInputs:
    """Evaluate every configured stop condition deterministically."""
    triggered: list[StopReason] = []
    details: list[str] = []
    overruns = budget_overruns(policy.hard_budget, signals.usage)
    if overruns:
        triggered.append(StopReason.BUDGET_EXHAUSTED)
        details.append("hard budget exhausted: " + "; ".join(overruns))
    if policy.target_condition is not None and signals.target_condition_met:
        triggered.append(StopReason.TARGET_REACHED)
        details.append(f"target condition reached: {policy.target_condition}")
    if policy.plateau_window is not None:
        window = policy.plateau_window
        threshold = policy.plateau_min_improvement if policy.plateau_min_improvement else 0.0
        recent = signals.recent_target_deltas[-window:]
        if len(recent) >= window and all(delta < threshold for delta in recent):
            triggered.append(StopReason.PLATEAU)
            details.append(f"no improvement >= {threshold} over the last {window} comparisons")
    if (
        policy.disagreement_threshold is not None
        and signals.evaluator_disagreement is not None
        and signals.evaluator_disagreement > policy.disagreement_threshold
    ):
        triggered.append(StopReason.EVALUATOR_DISAGREEMENT)
        details.append(
            f"evaluator disagreement {signals.evaluator_disagreement} exceeds "
            f"{policy.disagreement_threshold}"
        )
    if (
        policy.unresolved_severity_threshold is not None
        and signals.unresolved_critical_counterexamples > 0
    ):
        triggered.append(StopReason.UNRESOLVED_CRITICAL_ISSUE)
        details.append(
            f"{signals.unresolved_critical_counterexamples} unresolved counterexamples at or "
            f"above severity {policy.unresolved_severity_threshold!r}"
        )
    return CampaignStatusInputs(triggered=tuple(triggered), details=tuple(details))


@dataclass(frozen=True)
class CampaignStatusInputs:
    triggered: tuple[StopReason, ...]
    details: tuple[str, ...]


class CampaignService:
    """Campaign lifecycle over the ledger, Git baseline, and event stream."""

    def __init__(
        self,
        paths: ProjectPaths,
        *,
        clock: Clock,
        ids: IdGenerator,
        git: GitRunner,
        ledger: LedgerStore | None = None,
        emitter: EventEmitter | None = None,
        redactor: Redactor | None = None,
    ) -> None:
        self._paths = paths
        self._clock = clock
        self._ids = ids
        self._git = git
        self._ledger = ledger if ledger is not None else LedgerStore(paths.ledger_dir)
        self._emitter: EventEmitter = emitter if emitter is not None else RecordingEventEmitter()
        self._redactor = redactor if redactor is not None else Redactor()

    # -- persistence ---------------------------------------------------------

    def _revision_ids(self, campaign_id: str) -> list[str]:
        prefix = campaign_id + _REVISION_SEPARATOR
        return sorted(
            record_id
            for record_id in self._ledger.list_ids("campaigns")
            if record_id.startswith(prefix)
        )

    def _persist(self, campaign: CampaignV1) -> CampaignV1:
        revision = len(self._revision_ids(campaign.campaign_id)) + 1
        record_id = f"{campaign.campaign_id}{_REVISION_SEPARATOR}{revision:06d}"
        self._ledger.append("campaigns", record_id, campaign)
        return campaign

    def load(self, campaign_id: str) -> CampaignV1:
        revisions = self._revision_ids(campaign_id)
        if not revisions:
            raise InvalidInvocationError(f"unknown campaign: {campaign_id!r}")
        return self._ledger.load("campaigns", revisions[-1], CampaignV1)

    def require_active(self, campaign_id: str) -> CampaignV1:
        campaign = self.load(campaign_id)
        if campaign.state is not CampaignState.ACTIVE:
            raise GateFailedError(
                f"campaign {campaign_id} is {campaign.state}; new experiments are blocked",
                hint="resume or explicitly reopen the campaign first",
            )
        return campaign

    # -- lifecycle -----------------------------------------------------------

    def start(
        self,
        *,
        objective: str,
        spec_digest: str,
        spec_frozen: bool,
        budget: BudgetV1,
        stop_policy: StopPolicyV1,
        baseline_commit: str,
        target_branch: str,
        spec_discovery_only: bool = False,
    ) -> CampaignV1:
        """Start a campaign against a frozen spec, baseline, and hard budget.

        A campaign without a frozen spec is refused unless it is explicitly a
        spec-discovery campaign; the ``spec_discovery_only`` flag is persisted
        so its outputs can never be promoted into product state.
        """
        if not spec_frozen and not spec_discovery_only:
            raise GateFailedError(
                "campaign start requires a frozen spec",
                hint="freeze the spec, or start with spec_discovery_only=True "
                "(outputs are non-promotable)",
            )
        if not stop_policy.hard_budget.has_hard_cap():
            raise InvalidInvocationError(
                "stop policy has no hard resource cap",
                hint="set at least one limit on StopPolicyV1.hard_budget",
            )
        if not budget.has_hard_cap():
            raise InvalidInvocationError(
                "campaign budget has no hard resource cap",
                hint="set at least one limit on the campaign budget",
            )
        commit = self._git.validate_ref(baseline_commit)
        self._git.validate_branch_name(target_branch)
        if not self._git.branch_exists(target_branch):
            raise InvalidInvocationError(f"target branch does not exist: {target_branch!r}")
        campaign = CampaignV1(
            campaign_id=self._ids.new_id("campaign"),
            objective=objective,
            spec_digest=spec_digest,
            baseline=GitRefV1(branch=target_branch, commit=commit, dirty=self._git.is_dirty()),
            target_branch=target_branch,
            budget=budget,
            stop_policy=stop_policy,
            state=CampaignState.ACTIVE,
            spec_discovery_only=spec_discovery_only,
            created_at=self._clock.now(),
        )
        self._persist(campaign)
        self._emitter.emit(
            "dev.gauntlet.campaign.started.v1",
            {
                "campaign_id": campaign.campaign_id,
                "spec_digest": campaign.spec_digest,
                "baseline_commit": commit,
                "target_branch": target_branch,
                "spec_discovery_only": spec_discovery_only,
            },
        )
        return campaign

    def resume(self, campaign_id: str) -> tuple[CampaignV1, HandoffV1 | None]:
        """Reload the latest campaign state and its latest sanitized handoff."""
        campaign = self.load(campaign_id)
        if campaign.state is CampaignState.STOPPED:
            raise GateFailedError(
                f"campaign {campaign_id} is stopped ({campaign.stop_reason})",
                hint="explicitly reopen the campaign to continue",
            )
        handoff = self.latest_handoff(campaign_id)
        if campaign.state is not CampaignState.ACTIVE:
            campaign = campaign.model_copy(
                update={"state": CampaignState.ACTIVE, "updated_at": self._clock.now()}
            )
            self._persist(campaign)
        self._emitter.emit(
            "dev.gauntlet.campaign.resumed.v1",
            {"campaign_id": campaign_id, "handoff_id": handoff.handoff_id if handoff else None},
        )
        return campaign, handoff

    def latest_handoff(self, campaign_id: str) -> HandoffV1 | None:
        handoffs = [
            self._ledger.load("campaigns", record_id, HandoffV1)
            for record_id in self._ledger.list_ids("campaigns")
            if record_id.startswith("handoff:")
        ]
        matching = [handoff for handoff in handoffs if handoff.campaign_id == campaign_id]
        if not matching:
            return None
        return max(matching, key=lambda handoff: (handoff.created_at, handoff.handoff_id))

    def checkpoint(
        self,
        campaign_id: str,
        *,
        current_branches: Sequence[str] = (),
        latest_accepted: str | None = None,
        latest_rejected: str | None = None,
        unresolved_counterexamples: Sequence[str] = (),
        pending_approvals: Sequence[str] = (),
        legal_next_actions: Sequence[str] = (),
    ) -> HandoffV1:
        """Write a compact, redacted handoff to .gauntlet/handoffs/ + ledger."""
        campaign = self.load(campaign_id)
        stop = campaign.stop_policy
        stop_rules = [f"hard budget: {stop.hard_budget.model_dump(exclude_none=True)}"]
        if stop.target_condition is not None:
            stop_rules.append(f"target: {stop.target_condition}")
        if stop.plateau_window is not None:
            stop_rules.append(f"plateau window: {stop.plateau_window}")
        draft = HandoffV1(
            handoff_id=self._ids.new_id("handoff"),
            campaign_id=campaign_id,
            objective=campaign.objective,
            spec_digest=campaign.spec_digest,
            stop_rules=stop_rules,
            current_branches=list(current_branches),
            latest_accepted=latest_accepted,
            latest_rejected=latest_rejected,
            unresolved_counterexamples=list(unresolved_counterexamples),
            pending_approvals=list(pending_approvals),
            legal_next_actions=list(legal_next_actions)
            or ["gauntlet campaign resume", "gauntlet campaign status", "gauntlet campaign stop"],
            redacted=True,
            created_at=self._clock.now(),
        )
        redacted_payload, _report = self._redactor.redact_value(draft.model_dump(mode="json"))
        handoff = HandoffV1.model_validate(redacted_payload)
        handoff_file = self._paths.handoffs_dir / f"{handoff.handoff_id.replace(':', '__')}.json"
        atomic_write(handoff_file, canonical_bytes(handoff.model_dump(mode="json")))
        self._ledger.append("campaigns", handoff.handoff_id, handoff)
        updated = campaign.model_copy(
            update={"state": CampaignState.CHECKPOINTED, "updated_at": self._clock.now()}
        )
        self._persist(updated)
        self._emitter.emit(
            "dev.gauntlet.campaign.checkpointed.v1",
            {"campaign_id": campaign_id, "handoff_id": handoff.handoff_id},
        )
        return handoff

    def status(self, campaign_id: str, signals: StopSignals) -> CampaignStatus:
        """Report progress against ALL configured stop conditions."""
        campaign = self.load(campaign_id)
        result = evaluate_stop_policy(campaign.stop_policy, signals)
        return CampaignStatus(campaign=campaign, triggered=result.triggered, details=result.details)

    def stop(self, campaign_id: str, reason: StopReason, *, detail: str) -> CampaignV1:
        """Record the stop reason; further experiments are refused."""
        campaign = self.load(campaign_id)
        if campaign.state is CampaignState.STOPPED:
            raise InvalidInvocationError(f"campaign {campaign_id} is already stopped")
        stopped = campaign.model_copy(
            update={
                "state": CampaignState.STOPPED,
                "stop_reason": reason,
                "updated_at": self._clock.now(),
            }
        )
        self._persist(stopped)
        self._emitter.emit(
            "dev.gauntlet.campaign.stopped.v1",
            {"campaign_id": campaign_id, "reason": str(reason), "detail": detail},
        )
        return stopped

    def reopen(self, campaign_id: str, *, justification: str) -> CampaignV1:
        """Explicitly reopen a stopped campaign (recorded, never implicit)."""
        if not justification.strip():
            raise InvalidInvocationError("reopening a campaign requires a justification")
        campaign = self.load(campaign_id)
        if campaign.state is not CampaignState.STOPPED:
            raise InvalidInvocationError(f"campaign {campaign_id} is not stopped")
        reopened = campaign.model_copy(
            update={
                "state": CampaignState.ACTIVE,
                "stop_reason": None,
                "updated_at": self._clock.now(),
            }
        )
        self._persist(reopened)
        self._emitter.emit(
            "dev.gauntlet.campaign.reopened.v1",
            {"campaign_id": campaign_id, "justification": justification},
        )
        return reopened
