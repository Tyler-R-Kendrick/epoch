"""Deterministic read models projected from a graph snapshot.

Pure functions over :class:`gauntlet.activegraph_adapter.GraphSnapshot`
(plain dicts exported by the adapter): no LLM, no clock, no I/O. Outputs are
sorted so the same snapshot always projects the same read model — this is
what makes ``gauntlet status`` and ``gauntlet next`` reproducible.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from gauntlet.activegraph_adapter import GraphSnapshot
from gauntlet.activegraph_pack import (
    AUTHORITY_AUTO_APPROVE,
    CAMPAIGN_TRANSITIONS,
)
from gauntlet.constants import CampaignState, ExperimentStatus, IntentState

# ---------------------------------------------------------------------------
# Read model types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PendingApprovalView:
    intent_id: str
    capability: str
    action_class: str
    authority_decision: str
    state: str


@dataclass(frozen=True)
class CounterexampleView:
    counterexample_id: str
    candidate_id: str
    scope: str
    violated_rule: str
    severity: str


@dataclass(frozen=True)
class CampaignStatusView:
    campaign_id: str
    state: str
    objective: str
    spec_digest: str
    stop_reason: str | None
    experiment_counts: tuple[tuple[str, int], ...]
    open_issue_count: int
    open_counterexample_count: int
    pending_approval_count: int
    promotion_outcomes: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class NextAction:
    """One legal next step for ``gauntlet next``: a command plus its reason."""

    command: str
    reason: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _objects(snapshot: GraphSnapshot, node_type: str) -> list[dict[str, Any]]:
    return [obj["data"] for obj in snapshot.objects if obj["type"] == node_type]


def _campaign(snapshot: GraphSnapshot, campaign_id: str) -> dict[str, Any] | None:
    for data in _objects(snapshot, "campaign"):
        if data.get("campaign_id") == campaign_id:
            return data
    return None


# ---------------------------------------------------------------------------
# Projections
# ---------------------------------------------------------------------------


def pending_approvals(snapshot: GraphSnapshot) -> tuple[PendingApprovalView, ...]:
    """Intents still awaiting an approval or governance decision."""
    pending = [
        PendingApprovalView(
            intent_id=str(data["intent_id"]),
            capability=str(data.get("capability", "unknown")),
            action_class=str(data.get("action_class", "invalid")),
            authority_decision=str(data.get("authority_decision", "fail_closed")),
            state=str(data.get("state", IntentState.PROPOSED.value)),
        )
        for data in _objects(snapshot, "intent")
        if data.get("state") in (IntentState.PROPOSED.value, IntentState.VOTING.value)
        and data.get("authority_decision") != AUTHORITY_AUTO_APPROVE
    ]
    return tuple(sorted(pending, key=lambda view: view.intent_id))


def unresolved_counterexamples(snapshot: GraphSnapshot) -> tuple[CounterexampleView, ...]:
    open_ones = [
        CounterexampleView(
            counterexample_id=str(data["counterexample_id"]),
            candidate_id=str(data.get("candidate_id", "unknown")),
            scope=str(data.get("scope", "unknown")),
            violated_rule=str(data.get("violated_rule", "unknown")),
            severity=str(data.get("severity", "minor")),
        )
        for data in _objects(snapshot, "counterexample")
        if data.get("status") == "open"
    ]
    return tuple(sorted(open_ones, key=lambda view: view.counterexample_id))


def campaign_status(snapshot: GraphSnapshot, campaign_id: str) -> CampaignStatusView | None:
    """Full campaign read model, or None when the campaign is unknown."""
    campaign = _campaign(snapshot, campaign_id)
    if campaign is None:
        return None
    counts: dict[str, int] = {}
    for experiment in _objects(snapshot, "experiment"):
        if experiment.get("campaign_id") != campaign_id:
            continue
        status = str(experiment.get("status", ExperimentStatus.PROPOSED.value))
        counts[status] = counts.get(status, 0) + 1
    open_issues = sum(1 for issue in _objects(snapshot, "issue") if issue.get("status") == "open")
    promotions = tuple(
        sorted(
            (str(promotion["promotion_id"]), str(promotion.get("state", "pending")))
            for promotion in _objects(snapshot, "promotion")
            if promotion.get("campaign_id") == campaign_id
        )
    )
    return CampaignStatusView(
        campaign_id=campaign_id,
        state=str(campaign.get("state", CampaignState.DRAFT.value)),
        objective=str(campaign.get("objective", "")),
        spec_digest=str(campaign.get("spec_digest", "")),
        stop_reason=campaign.get("stop_reason"),
        experiment_counts=tuple(sorted(counts.items())),
        open_issue_count=open_issues,
        open_counterexample_count=len(unresolved_counterexamples(snapshot)),
        pending_approval_count=len(pending_approvals(snapshot)),
        promotion_outcomes=promotions,
    )


def next_transitions(
    snapshot: GraphSnapshot, campaign_id: str | None = None
) -> tuple[NextAction, ...]:
    """The state machine behind ``gauntlet next``: legal next steps, in order.

    Deterministic: the same snapshot always yields the same ordered actions.
    """
    actions: list[NextAction] = []
    frozen_specs = [spec for spec in _objects(snapshot, "spec") if spec.get("frozen")]
    if not frozen_specs:
        return (
            NextAction(
                command="gauntlet spec freeze",
                reason="no frozen spec exists; every campaign starts from a frozen spec",
            ),
        )
    campaigns = _objects(snapshot, "campaign")
    campaign = _campaign(snapshot, campaign_id) if campaign_id else None
    if campaign is None and campaigns:
        campaign = sorted(campaigns, key=lambda data: str(data.get("campaign_id")))[0]
    if campaign is None:
        return (
            NextAction(
                command="gauntlet campaign create",
                reason="a frozen spec exists but no campaign has been created",
            ),
        )
    state = CampaignState(str(campaign.get("state", CampaignState.DRAFT.value)))
    if state is CampaignState.DRAFT:
        actions.append(
            NextAction(
                command="gauntlet campaign activate",
                reason="the campaign is a draft; activate it to start the loop",
            )
        )
    elif state is CampaignState.CHECKPOINTED:
        actions.append(
            NextAction(
                command="gauntlet campaign resume",
                reason="the campaign is checkpointed; resume or stop it",
            )
        )
    elif state is CampaignState.STOPPED:
        return (
            NextAction(
                command="gauntlet handoff generate",
                reason=f"the campaign stopped ({campaign.get('stop_reason') or 'authorized'});"
                " hand off the durable state",
            ),
        )
    else:
        this_campaign = str(campaign.get("campaign_id"))
        experiments = [
            experiment
            for experiment in _objects(snapshot, "experiment")
            if experiment.get("campaign_id") == this_campaign
        ]
        running = [
            experiment
            for experiment in experiments
            if experiment.get("status") == ExperimentStatus.RUNNING.value
        ]
        kept = [
            experiment
            for experiment in experiments
            if experiment.get("status") == ExperimentStatus.KEEP.value
        ]
        for view in pending_approvals(snapshot):
            actions.append(
                NextAction(
                    command=f"gauntlet intent approve {view.intent_id}",
                    reason=f"intent {view.intent_id} awaits {view.authority_decision}"
                    f" for {view.action_class} {view.capability}",
                )
            )
        for experiment in sorted(running, key=lambda data: str(data.get("experiment_id"))):
            actions.append(
                NextAction(
                    command=f"gauntlet experiment evaluate {experiment['experiment_id']}",
                    reason="a running experiment needs evaluation before anything is promoted",
                )
            )
        pending_promotions = [
            promotion
            for promotion in _objects(snapshot, "promotion")
            if promotion.get("campaign_id") == this_campaign and promotion.get("state") == "pending"
        ]
        for promotion in sorted(pending_promotions, key=lambda data: str(data.get("promotion_id"))):
            actions.append(
                NextAction(
                    command=f"gauntlet promotion decide {promotion['promotion_id']}",
                    reason="a promotion has recorded gates and awaits aggregation",
                )
            )
        if kept and not pending_promotions:
            actions.append(
                NextAction(
                    command="gauntlet promotion request",
                    reason="a kept experiment has no pending promotion yet",
                )
            )
        if not running and unresolved_counterexamples(snapshot):
            actions.append(
                NextAction(
                    command="gauntlet experiment propose",
                    reason="open counterexamples exist and no experiment is running",
                )
            )
        if not actions:
            actions.append(
                NextAction(
                    command="gauntlet observe",
                    reason="no pending work; gather observations or stop the campaign",
                )
            )
    for target in sorted(CAMPAIGN_TRANSITIONS[state], key=lambda value: value.value):
        if target is CampaignState.STOPPED:
            actions.append(
                NextAction(
                    command="gauntlet campaign stop",
                    reason="stopping is always a legal authorized transition",
                )
            )
    return tuple(actions)
