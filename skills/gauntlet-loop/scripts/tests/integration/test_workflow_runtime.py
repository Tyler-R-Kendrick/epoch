"""Integration tests: real MAF declarative execution, network-free.

Every test drives the actual ``agent_framework_declarative`` loader and
runtime through ``WorkflowService``/``WorkflowRunner``; only the step
executor is a fake (no subprocesses, no network, no dotnet, no real sleep).
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest

from gauntlet.adapters.maf_workflow import StepResult
from gauntlet.models import WorkflowPlanV1, WorkflowStepV1
from gauntlet.paths import ProjectPaths
from gauntlet.support import FrozenClock
from gauntlet.workflows import WorkflowService, plan_digest

pytestmark = pytest.mark.filterwarnings("ignore:.*experimental.*")


class FakeStepExecutor:
    """Scripted per-step exit codes keyed by the command's first token pair."""

    def __init__(self, script: dict[str, list[int]] | None = None) -> None:
        self.calls: list[tuple[str, ...]] = []
        self._script = {key: list(codes) for key, codes in (script or {}).items()}

    def __call__(self, command: Sequence[str], *, timeout_seconds: int) -> StepResult:
        self.calls.append(tuple(command))
        codes = self._script.get(" ".join(command))
        code = codes.pop(0) if codes else 0
        return StepResult(exit_code=code, stdout=f"ran {' '.join(command)}", stderr="")


def step(step_id: str, command: list[str], **overrides: Any) -> WorkflowStepV1:
    base: dict[str, Any] = {
        "step_id": step_id,
        "display_name": step_id.replace("_", " ").title(),
        "command": command,
    }
    base.update(overrides)
    return WorkflowStepV1.model_validate(base)


def three_step_plan(name: str = "smoke-flow", *, checkpoint: bool = True) -> WorkflowPlanV1:
    return WorkflowPlanV1.model_validate(
        {
            "plan_id": f"workflow-plan:{name}",
            "workflow_name": name,
            "description": "a three step integration workflow",
            "checkpoint": checkpoint,
            "steps": [
                step("first_step", ["project", "doctor"]),
                step("second_step", ["spec", "validate"]),
                step("third_step", ["campaign", "start"]),
            ],
            "created_at": "2026-01-01T00:00:00Z",
        }
    )


@pytest.fixture()
def paths(tmp_path: Path) -> ProjectPaths:
    project = ProjectPaths(git_root=tmp_path)
    project.gauntlet_dir.mkdir()
    return project


def make_service(
    paths: ProjectPaths, executor: FakeStepExecutor
) -> WorkflowService:
    return WorkflowService(
        paths,
        executor=executor,
        clock=FrozenClock(),
        sleeper=lambda _seconds: None,
    )


def read_journal(paths: ProjectPaths, name: str) -> dict[str, Any]:
    journal_file = paths.workflow_checkpoints_dir / name / "journal.json"
    return json.loads(journal_file.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


# ---------------------------------------------------------------------------
# Plain runs
# ---------------------------------------------------------------------------


def test_three_step_plan_runs_in_order_with_journal(paths: ProjectPaths) -> None:
    executor = FakeStepExecutor()
    service = make_service(paths, executor)
    plan = three_step_plan()
    service.generate(plan)
    report = service.run(plan.workflow_name)
    assert report.status == "completed"
    assert executor.calls == [
        ("project", "doctor"),
        ("spec", "validate"),
        ("campaign", "start"),
    ]
    assert report.completed_steps == ("first_step", "second_step", "third_step")
    journal = read_journal(paths, plan.workflow_name)
    assert journal["status"] == "completed"
    assert [attempt["step_id"] for attempt in journal["attempts"]] == [
        "first_step",
        "second_step",
        "third_step",
    ]
    assert all(attempt["outcome"] == "success" for attempt in journal["attempts"])


def test_checkpoint_files_created_when_enabled(paths: ProjectPaths) -> None:
    service = make_service(paths, FakeStepExecutor())
    plan = three_step_plan()
    service.generate(plan)
    service.run(plan.workflow_name)
    checkpoints = paths.workflow_checkpoints_dir / plan.workflow_name / "checkpoints"
    assert checkpoints.is_dir()
    assert list(checkpoints.glob("*.json"))


def test_no_checkpoint_files_when_disabled(paths: ProjectPaths) -> None:
    service = make_service(paths, FakeStepExecutor())
    plan = three_step_plan("nocheck-flow", checkpoint=False)
    service.generate(plan)
    report = service.run(plan.workflow_name)
    assert report.status == "completed"
    checkpoints = paths.workflow_checkpoints_dir / plan.workflow_name / "checkpoints"
    assert not checkpoints.is_dir() or not list(checkpoints.glob("*.json"))


# ---------------------------------------------------------------------------
# Approval pause and resume
# ---------------------------------------------------------------------------


def approval_plan(name: str = "approval-flow") -> WorkflowPlanV1:
    return WorkflowPlanV1.model_validate(
        {
            "plan_id": f"workflow-plan:{name}",
            "workflow_name": name,
            "description": "a workflow with an approval-gated middle step",
            "steps": [
                step("first_step", ["project", "doctor"]),
                step("gated_step", ["promote", "plan"], require_approval=True),
                step("third_step", ["campaign", "start"]),
            ],
            "created_at": "2026-01-01T00:00:00Z",
        }
    )


def test_approval_step_pauses_cleanly_with_persisted_status(
    paths: ProjectPaths,
) -> None:
    executor = FakeStepExecutor()
    service = make_service(paths, executor)
    plan = approval_plan()
    service.generate(plan)
    report = service.run(plan.workflow_name)
    assert report.status == "paused"
    assert report.pending_request_ids
    assert executor.calls == [("project", "doctor")]
    journal = read_journal(paths, plan.workflow_name)
    assert journal["status"] == "paused"
    assert journal["pending_request_ids"]
    assert journal["completed_steps"] == ["first_step"]


def test_resume_completes_remaining_steps_exactly_once(paths: ProjectPaths) -> None:
    executor = FakeStepExecutor()
    service = make_service(paths, executor)
    plan = approval_plan()
    service.generate(plan)
    service.run(plan.workflow_name)
    report = service.resume(plan.workflow_name)
    assert report.status == "completed"
    assert executor.calls == [
        ("project", "doctor"),
        ("promote", "plan"),
        ("campaign", "start"),
    ]
    journal = read_journal(paths, plan.workflow_name)
    assert journal["status"] == "completed"
    assert journal["completed_steps"] == ["first_step", "gated_step", "third_step"]


def test_journal_replay_resume_after_in_step_approval_pause(
    paths: ProjectPaths,
) -> None:
    """A pause raised INSIDE gauntlet_step (CLI exit 3) resumes by replay."""
    executor = FakeStepExecutor({"promote plan": [3, 0]})
    service = make_service(paths, executor)
    plan = WorkflowPlanV1.model_validate(
        {
            "plan_id": "workflow-plan:inline-approval",
            "workflow_name": "inline-approval",
            "description": "the CLI itself demands approval mid-run",
            "steps": [
                step("first_step", ["project", "doctor"]),
                step("asking_step", ["promote", "plan"]),
                step("third_step", ["campaign", "start"]),
            ],
            "created_at": "2026-01-01T00:00:00Z",
        }
    )
    service.generate(plan)
    report = service.run(plan.workflow_name)
    assert report.status == "paused"
    assert executor.calls == [("project", "doctor"), ("promote", "plan")]
    report = service.resume(plan.workflow_name)
    assert report.status == "completed"
    # first_step was skipped idempotently; the asking step ran again after
    # approval, and the third step ran exactly once.
    assert executor.calls == [
        ("project", "doctor"),
        ("promote", "plan"),
        ("promote", "plan"),
        ("campaign", "start"),
    ]


# ---------------------------------------------------------------------------
# Self-healing round trip
# ---------------------------------------------------------------------------


def test_self_healing_round_trip(paths: ProjectPaths) -> None:
    """Fail on exit 8, heal, promote, regenerate, and re-run to success."""
    executor = FakeStepExecutor({"spec validate": [8]})
    service = make_service(paths, executor)
    plan = three_step_plan("healing-flow")
    service.generate(plan)
    report = service.run(plan.workflow_name)
    assert report.status == "failed"
    assert executor.calls == [("project", "doctor"), ("spec", "validate")]

    proposal = service.heal(plan.workflow_name)
    assert proposal.patch["kind"] == "raise-max-retries"
    assert proposal.patch["step_id"] == "second_step"
    assert proposal.candidate_plan.parent_plan_digest == plan_digest(plan)

    # Simulated promotion: the gauntlet loop accepted the candidate, so the
    # promote path regenerates the workflow from the repaired plan.
    service.generate(proposal.candidate_plan)

    # This time the dependency flakes once and recovers on the retry.
    retry_executor = FakeStepExecutor({"spec validate": [8, 0]})
    retry_service = make_service(paths, retry_executor)
    report = retry_service.run(plan.workflow_name)
    assert report.status == "completed"
    assert retry_executor.calls == [
        ("project", "doctor"),
        ("spec", "validate"),
        ("spec", "validate"),
        ("campaign", "start"),
    ]
    journal = read_journal(paths, plan.workflow_name)
    outcomes = [attempt["outcome"] for attempt in journal["attempts"]]
    assert "retry-scheduled" in outcomes
    assert journal["status"] == "completed"
