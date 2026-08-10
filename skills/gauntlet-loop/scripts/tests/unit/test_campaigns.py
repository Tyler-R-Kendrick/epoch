"""Campaign service: start/resume/checkpoint/status/stop over a real repo."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pytest

from gauntlet.campaigns import (
    BudgetUsage,
    CampaignService,
    NullIntentGate,
    RecordingEventEmitter,
    StopSignals,
    budget_overruns,
)
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ActionClass, CampaignState, StopReason
from gauntlet.errors import (
    ApprovalRequiredError,
    GateFailedError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.gitops import GitRunner
from gauntlet.models import BudgetV1, HandoffV1, StopPolicyV1
from gauntlet.paths import ProjectPaths
from gauntlet.redaction import REDACTED
from gauntlet.support import FrozenClock, SequentialIdGenerator

SPEC_DIGEST = digest_value({"spec": "frozen"})


@dataclass
class Stack:
    paths: ProjectPaths
    git: GitRunner
    service: CampaignService
    emitter: RecordingEventEmitter


@pytest.fixture()
def stack(git_repo: Path, clock: FrozenClock, ids: SequentialIdGenerator) -> Stack:
    paths = ProjectPaths(git_root=git_repo)
    git = GitRunner(git_repo)
    emitter = RecordingEventEmitter()
    service = CampaignService(paths, clock=clock, ids=ids, git=git, emitter=emitter)
    return Stack(paths=paths, git=git, service=service, emitter=emitter)


def hard_policy(**overrides: object) -> StopPolicyV1:
    payload: dict[str, object] = {"hard_budget": BudgetV1(max_experiments=5).model_dump()}
    payload.update(overrides)
    return StopPolicyV1.model_validate(payload)


def start_campaign(stack: Stack, **overrides: object) -> str:
    kwargs: dict[str, object] = {
        "objective": "repair the defective artifact",
        "spec_digest": SPEC_DIGEST,
        "spec_frozen": True,
        "budget": BudgetV1(max_experiments=5),
        "stop_policy": hard_policy(),
        "baseline_commit": stack.git.current_commit(),
        "target_branch": "main",
    }
    kwargs.update(overrides)
    return stack.service.start(**kwargs).campaign_id  # type: ignore[arg-type]


class TestStart:
    def test_start_persists_active_campaign(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        campaign = stack.service.load(campaign_id)
        assert campaign.state is CampaignState.ACTIVE
        assert campaign.baseline.commit == stack.git.current_commit()
        assert campaign.target_branch == "main"
        assert stack.emitter.events[0][0] == "dev.gauntlet.campaign.started.v1"

    def test_start_requires_frozen_spec(self, stack: Stack) -> None:
        with pytest.raises(GateFailedError):
            start_campaign(stack, spec_frozen=False)

    def test_spec_discovery_campaign_is_flagged_non_promotable(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack, spec_frozen=False, spec_discovery_only=True)
        assert stack.service.load(campaign_id).spec_discovery_only is True

    def test_start_requires_hard_budget_cap(self, stack: Stack) -> None:
        with pytest.raises(InvalidInvocationError):
            start_campaign(stack, stop_policy=StopPolicyV1(hard_budget=BudgetV1()))
        with pytest.raises(InvalidInvocationError):
            start_campaign(stack, budget=BudgetV1())

    def test_start_validates_git_inputs(self, stack: Stack) -> None:
        with pytest.raises(InvalidInvocationError):
            start_campaign(stack, target_branch="no-such-branch")
        with pytest.raises(SecurityViolationError):
            start_campaign(stack, baseline_commit="--upload-pack=/bin/sh")


class TestStopConditions:
    def test_budget_exhaustion_triggers(self, stack: Stack) -> None:
        campaign_id = start_campaign(
            stack, stop_policy=hard_policy(hard_budget=BudgetV1(max_experiments=2).model_dump())
        )
        status = stack.service.status(campaign_id, StopSignals(usage=BudgetUsage(experiments=2)))
        assert StopReason.BUDGET_EXHAUSTED in status.triggered
        assert status.should_stop

    def test_target_condition_triggers(self, stack: Stack) -> None:
        campaign_id = start_campaign(
            stack, stop_policy=hard_policy(target_condition="accuracy >= 0.9")
        )
        status = stack.service.status(campaign_id, StopSignals(target_condition_met=True))
        assert StopReason.TARGET_REACHED in status.triggered

    def test_plateau_triggers(self, stack: Stack) -> None:
        campaign_id = start_campaign(
            stack, stop_policy=hard_policy(plateau_window=3, plateau_min_improvement=0.01)
        )
        status = stack.service.status(
            campaign_id, StopSignals(recent_target_deltas=(0.0, 0.001, 0.005))
        )
        assert StopReason.PLATEAU in status.triggered
        improving = stack.service.status(
            campaign_id, StopSignals(recent_target_deltas=(0.0, 0.001, 0.5))
        )
        assert StopReason.PLATEAU not in improving.triggered

    def test_disagreement_triggers(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack, stop_policy=hard_policy(disagreement_threshold=0.3))
        status = stack.service.status(campaign_id, StopSignals(evaluator_disagreement=0.5))
        assert StopReason.EVALUATOR_DISAGREEMENT in status.triggered

    def test_unresolved_critical_triggers(self, stack: Stack) -> None:
        campaign_id = start_campaign(
            stack, stop_policy=hard_policy(unresolved_severity_threshold="critical")
        )
        status = stack.service.status(
            campaign_id, StopSignals(unresolved_critical_counterexamples=1)
        )
        assert StopReason.UNRESOLVED_CRITICAL_ISSUE in status.triggered

    def test_no_signals_no_stop(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        status = stack.service.status(campaign_id, StopSignals())
        assert status.triggered == ()
        assert not status.should_stop

    def test_budget_overruns_each_axis(self) -> None:
        budget = BudgetV1(
            max_experiments=1, max_wall_clock_seconds=10, max_evaluator_runs=2, max_cost_usd=1.0
        )
        usage = BudgetUsage(experiments=1, wall_clock_seconds=10, evaluator_runs=2, cost_usd=1.0)
        assert len(budget_overruns(budget, usage)) == 4
        assert budget_overruns(budget, BudgetUsage()) == []


class TestCheckpointAndResume:
    def test_checkpoint_handoff_is_redacted_and_loadable(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        handoff = stack.service.checkpoint(
            campaign_id,
            current_branches=["gauntlet/c/e1"],
            latest_rejected="rejected: auth header Bearer abcdef0123456789SECRETTOKEN",
        )
        assert handoff.redacted is True
        assert handoff.latest_rejected is not None
        assert "SECRETTOKEN" not in handoff.latest_rejected
        assert REDACTED in handoff.latest_rejected
        files = list(stack.paths.handoffs_dir.glob("*.json"))
        assert len(files) == 1
        loaded = HandoffV1.model_validate(json.loads(files[0].read_text(encoding="utf-8")))
        assert loaded == handoff
        assert stack.service.load(campaign_id).state is CampaignState.CHECKPOINTED

    def test_resume_reloads_state_and_latest_handoff(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        first = stack.service.checkpoint(campaign_id, current_branches=["a"])
        stack.service.resume(campaign_id)
        second = stack.service.checkpoint(campaign_id, current_branches=["a", "b"])
        campaign, handoff = stack.service.resume(campaign_id)
        assert campaign.state is CampaignState.ACTIVE
        assert handoff is not None
        assert handoff.handoff_id == second.handoff_id
        assert handoff.handoff_id != first.handoff_id


class TestStopAndReopen:
    def test_stop_prevents_new_experiments(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        stopped = stack.service.stop(
            campaign_id, StopReason.AUTHORIZED_STOP, detail="operator requested"
        )
        assert stopped.state is CampaignState.STOPPED
        assert stopped.stop_reason is StopReason.AUTHORIZED_STOP
        with pytest.raises(GateFailedError):
            stack.service.require_active(campaign_id)
        with pytest.raises(GateFailedError):
            stack.service.resume(campaign_id)

    def test_reopen_allows_experiments_again(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        stack.service.stop(campaign_id, StopReason.BUDGET_EXHAUSTED, detail="cap hit")
        with pytest.raises(InvalidInvocationError):
            stack.service.reopen(campaign_id, justification="   ")
        reopened = stack.service.reopen(campaign_id, justification="budget raised by governance")
        assert reopened.state is CampaignState.ACTIVE
        assert reopened.stop_reason is None
        assert stack.service.require_active(campaign_id).campaign_id == campaign_id

    def test_stop_is_recorded_once(self, stack: Stack) -> None:
        campaign_id = start_campaign(stack)
        stack.service.stop(campaign_id, StopReason.PLATEAU, detail="flat")
        with pytest.raises(InvalidInvocationError):
            stack.service.stop(campaign_id, StopReason.PLATEAU, detail="again")


class TestNullIntentGate:
    def test_allows_low_risk_and_blocks_costly(self) -> None:
        gate = NullIntentGate()
        gate.require_committed("inspect", action_class=ActionClass.R0, detail="read")
        gate.require_committed(
            "edit-candidate-worktree", action_class=ActionClass.R1, detail="edit"
        )
        with pytest.raises(ApprovalRequiredError):
            gate.require_committed(
                "run-costly-experiment", action_class=ActionClass.R2, detail="gpu"
            )
