"""Unit tests for durable workflow generation, drift, healing, and exit codes."""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
import yaml

from gauntlet.adapters.maf_workflow import RunJournal, StepResult, StepSession
from gauntlet.canonical_json import digest_value
from gauntlet.errors import (
    ConflictError,
    GateFailedError,
    InconclusiveError,
    InvalidInvocationError,
)
from gauntlet.models import WorkflowPlanV1, WorkflowStepV1
from gauntlet.paths import ProjectPaths, find_skill_root
from gauntlet.redaction import Redactor
from gauntlet.support import FrozenClock
from gauntlet.workflows import (
    GENERATED_HEADER,
    WorkflowService,
    plan_digest,
    render_workflow_yaml,
)

pytestmark = pytest.mark.filterwarnings("ignore:.*experimental.*")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_step(step_id: str = "step_one", **overrides: Any) -> WorkflowStepV1:
    base: dict[str, Any] = {
        "step_id": step_id,
        "display_name": step_id.replace("_", " ").title(),
        "command": ["project", "doctor"],
    }
    base.update(overrides)
    return WorkflowStepV1.model_validate(base)


def make_plan(name: str = "demo-flow", **overrides: Any) -> WorkflowPlanV1:
    base: dict[str, Any] = {
        "plan_id": f"workflow-plan:{name}",
        "workflow_name": name,
        "description": "a demo workflow",
        "steps": [make_step()],
        "created_at": "2026-01-01T00:00:00Z",
    }
    base.update(overrides)
    return WorkflowPlanV1.model_validate(base)


@pytest.fixture()
def paths(tmp_path: Path) -> ProjectPaths:
    project = ProjectPaths(git_root=tmp_path)
    project.gauntlet_dir.mkdir()
    return project


@pytest.fixture()
def service(paths: ProjectPaths, clock: FrozenClock) -> WorkflowService:
    return WorkflowService(paths, clock=clock)


class ScriptedExecutor:
    """Returns exit codes from a script keyed by joined argv; records calls."""

    def __init__(self, script: dict[str, list[int]] | None = None, default: int = 0) -> None:
        self.calls: list[tuple[str, ...]] = []
        self._script = {key: list(codes) for key, codes in (script or {}).items()}
        self._default = default
        self.stdout = "ok"

    def __call__(self, command: Sequence[str], *, timeout_seconds: int) -> StepResult:
        self.calls.append(tuple(command))
        codes = self._script.get(" ".join(command))
        code = codes.pop(0) if codes else self._default
        return StepResult(exit_code=code, stdout=self.stdout, stderr="")


class RecordingSleeper:
    def __init__(self) -> None:
        self.delays: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.delays.append(seconds)


def make_session(
    tmp_path: Path,
    executor: ScriptedExecutor,
    *,
    intent_verifier: Any = None,
) -> tuple[StepSession, RunJournal, RecordingSleeper]:
    journal = RunJournal(
        tmp_path / "journal.json",
        workflow_name="demo-flow",
        plan_digest="sha256:" + "0" * 64,
        clock=FrozenClock(),
        redactor=Redactor(),
    )
    sleeper = RecordingSleeper()
    session = StepSession(
        journal, executor, sleeper=sleeper, intent_verifier=intent_verifier
    )
    return session, journal, sleeper


def invoke(session: StepSession, **overrides: Any) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "step_id": "step_one",
        "command": ["project", "doctor"],
    }
    kwargs.update(overrides)
    return session.invoke(**kwargs)


def assert_no_powerfx(node: Any) -> None:
    if isinstance(node, str):
        assert not node.startswith("=")
    elif isinstance(node, dict):
        for value in node.values():
            assert_no_powerfx(value)
    elif isinstance(node, list):
        for value in node:
            assert_no_powerfx(value)


# ---------------------------------------------------------------------------
# Deterministic generation and digest binding
# ---------------------------------------------------------------------------


def test_render_is_deterministic_and_byte_identical() -> None:
    plan = make_plan()
    assert render_workflow_yaml(plan) == render_workflow_yaml(plan)


def test_generate_twice_is_byte_identical(service: WorkflowService) -> None:
    plan = make_plan()
    first = service.generate(plan)
    first_bytes = Path(first.yaml_path).read_bytes()
    second = service.generate(plan)
    assert Path(second.yaml_path).read_bytes() == first_bytes
    assert first.yaml_digest == second.yaml_digest


def test_yaml_header_binds_plan_digest(service: WorkflowService) -> None:
    plan = make_plan()
    generated = service.generate(plan)
    lines = Path(generated.yaml_path).read_text(encoding="utf-8").splitlines()
    assert lines[0] == GENERATED_HEADER
    assert lines[1] == f"# plan-digest: {digest_value(plan.model_dump(mode='json'))}"
    assert generated.plan_digest == plan_digest(plan)


def test_generated_yaml_contains_no_powerfx_expressions() -> None:
    plan = make_plan(
        steps=[
            make_step("plain_step"),
            make_step("gated_step", require_approval=True, action_class="R3"),
        ]
    )
    assert_no_powerfx(yaml.safe_load(render_workflow_yaml(plan)))


def test_render_refuses_powerfx_looking_literals() -> None:
    plan = make_plan(steps=[make_step(command=["=Local.injected", "doctor"])])
    with pytest.raises(InvalidInvocationError, match="literal-only"):
        render_workflow_yaml(plan)


def test_approval_gate_precedes_r2_plus_and_flagged_steps() -> None:
    plan = make_plan(
        steps=[
            make_step("read_step", action_class="R0"),
            make_step("costly_step", action_class="R2"),
            make_step("flagged_step", require_approval=True),
        ]
    )
    actions = yaml.safe_load(render_workflow_yaml(plan))["actions"]
    ids = [action["id"] for action in actions]
    assert ids == [
        "read_step",
        "approve_costly_step",
        "costly_step",
        "approve_flagged_step",
        "flagged_step",
    ]
    assert actions[1]["kind"] == "RequestExternalInput"
    assert actions[3]["kind"] == "RequestExternalInput"


# ---------------------------------------------------------------------------
# Drift detection
# ---------------------------------------------------------------------------


def test_validate_passes_for_untouched_yaml(service: WorkflowService) -> None:
    plan = make_plan()
    service.generate(plan)
    assert service.validate(plan.workflow_name) == plan_digest(plan)


def test_hand_edited_yaml_fails_validate_with_diff_hint(
    service: WorkflowService,
) -> None:
    plan = make_plan()
    generated = service.generate(plan)
    yaml_file = Path(generated.yaml_path)
    edited = yaml_file.read_text(encoding="utf-8").replace(
        "displayName: Step One", "displayName: Hand Edited"
    )
    yaml_file.write_text(edited, encoding="utf-8")
    with pytest.raises(GateFailedError, match="drifted") as excinfo:
        service.validate(plan.workflow_name)
    assert excinfo.value.hint is not None
    assert "first difference at line" in excinfo.value.hint


def test_sync_reports_drift_and_overwrites_nothing(service: WorkflowService) -> None:
    plan = make_plan()
    generated = service.generate(plan)
    yaml_file = Path(generated.yaml_path)
    edited = yaml_file.read_text(encoding="utf-8") + "# hand edit\n"
    yaml_file.write_text(edited, encoding="utf-8")
    with pytest.raises(ConflictError, match="demo-flow.yaml"):
        service.sync()
    assert yaml_file.read_text(encoding="utf-8") == edited


def test_sync_regenerates_missing_yaml(service: WorkflowService) -> None:
    plan = make_plan()
    generated = service.generate(plan)
    yaml_file = Path(generated.yaml_path)
    original = yaml_file.read_bytes()
    yaml_file.unlink()
    report = service.sync()
    assert report["regenerated"] == [plan.workflow_name]
    assert yaml_file.read_bytes() == original


def test_status_lists_plans_with_drift_state(
    service: WorkflowService, paths: ProjectPaths
) -> None:
    plan = make_plan()
    generated = service.generate(plan)
    entries = service.status()
    assert len(entries) == 1
    assert entries[0].workflow_name == plan.workflow_name
    assert entries[0].plan_digest == plan_digest(plan)
    assert entries[0].drifted is False
    assert entries[0].last_run_status is None
    Path(generated.yaml_path).write_text("tampered\n", encoding="utf-8")
    assert service.status()[0].drifted is True


# ---------------------------------------------------------------------------
# Bundled templates
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("template", ["campaign-baseline", "self-heal-repair"])
def test_bundled_template_round_trips_through_the_model(template: str) -> None:
    path = find_skill_root() / "assets" / "workflows" / f"{template}.plan.json"
    document = json.loads(path.read_text(encoding="utf-8"))
    plan = WorkflowPlanV1.model_validate(document)
    assert plan.workflow_name == template
    assert plan.steps
    assert plan.model_dump(mode="json") == WorkflowPlanV1.model_validate(
        plan.model_dump(mode="json")
    ).model_dump(mode="json")
    rendered = render_workflow_yaml(plan)
    assert rendered.startswith(GENERATED_HEADER)
    assert_no_powerfx(yaml.safe_load(rendered))


@pytest.mark.parametrize("template", ["campaign-baseline", "self-heal-repair"])
def test_bundled_template_ends_with_approval_gated_promote_apply(template: str) -> None:
    path = find_skill_root() / "assets" / "workflows" / f"{template}.plan.json"
    plan = WorkflowPlanV1.model_validate(json.loads(path.read_text(encoding="utf-8")))
    final = plan.steps[-1]
    assert final.command == ["promote", "apply"]
    assert final.require_approval is True


# ---------------------------------------------------------------------------
# Promotion guard
# ---------------------------------------------------------------------------


def test_generate_refuses_unpromoted_lineage(service: WorkflowService) -> None:
    deployed = make_plan()
    service.generate(deployed)
    stranger = make_plan(steps=[make_step(max_retries=3)])
    with pytest.raises(ConflictError, match="descend"):
        service.generate(stranger)


def test_generate_accepts_promoted_child_plan(service: WorkflowService) -> None:
    deployed = make_plan()
    service.generate(deployed)
    child = make_plan(
        steps=[make_step(max_retries=3)],
        parent_plan_digest=plan_digest(deployed),
    )
    generated = service.generate(child)
    assert generated.plan_digest == plan_digest(child)


def test_generate_force_promoted_overrides_lineage(service: WorkflowService) -> None:
    deployed = make_plan()
    service.generate(deployed)
    stranger = make_plan(steps=[make_step(max_retries=3)])
    generated = service.generate(stranger, force_promoted=True)
    assert generated.plan_digest == plan_digest(stranger)


def test_generate_identical_plan_is_idempotent(service: WorkflowService) -> None:
    plan = make_plan()
    service.generate(plan)
    service.generate(plan)  # no lineage error for a byte-identical plan


# ---------------------------------------------------------------------------
# Exit-code mapping (fake StepExecutor, every path)
# ---------------------------------------------------------------------------


def test_exit_zero_marks_step_complete(tmp_path: Path) -> None:
    session, journal, _ = make_session(tmp_path, ScriptedExecutor(default=0))
    record = invoke(session)
    assert record["outcome"] == "success"
    assert journal.completed_steps == ["step_one"]
    assert journal.status == "running"


def test_exit_eight_retries_then_succeeds(tmp_path: Path) -> None:
    executor = ScriptedExecutor({"project doctor": [8, 0]})
    session, journal, sleeper = make_session(tmp_path, executor)
    record = invoke(session, max_retries=2)
    assert record["outcome"] == "success"
    assert len(executor.calls) == 2
    assert sleeper.delays == [0.5]
    outcomes = [attempt["outcome"] for attempt in journal.attempts]
    assert outcomes == ["retry-scheduled", "success"]


def test_exit_eight_without_retries_halts_failed(tmp_path: Path) -> None:
    session, journal, sleeper = make_session(tmp_path, ScriptedExecutor(default=8))
    record = invoke(session, max_retries=0)
    assert record["outcome"] == "dependency-unavailable"
    assert journal.status == "failed"
    assert sleeper.delays == []


def test_exit_three_pauses_and_skips_the_rest(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=3)
    session, journal, _ = make_session(tmp_path, executor)
    record = invoke(session)
    assert record["outcome"] == "approval-required"
    assert journal.status == "paused"
    follow_up = invoke(session, step_id="step_two")
    assert follow_up["outcome"] == "skipped"
    assert len(executor.calls) == 1


def test_exit_four_end_halts_failed(tmp_path: Path) -> None:
    session, journal, _ = make_session(tmp_path, ScriptedExecutor(default=4))
    record = invoke(session, on_gate_failure="end")
    assert record["outcome"] == "gate-failed"
    assert journal.status == "failed"


def test_exit_four_continue_records_and_continues(tmp_path: Path) -> None:
    executor = ScriptedExecutor({"project doctor": [4]}, default=0)
    session, journal, _ = make_session(tmp_path, executor)
    record = invoke(session, on_gate_failure="continue")
    assert record["outcome"] == "gate-failed-continue"
    assert journal.status == "running"
    follow_up = invoke(session, step_id="step_two", command=["spec", "validate"])
    assert follow_up["outcome"] == "success"


def test_exit_five_halts_inconclusive_never_promote(tmp_path: Path) -> None:
    session, journal, _ = make_session(tmp_path, ScriptedExecutor(default=5))
    record = invoke(session)
    assert record["outcome"] == "inconclusive"
    assert journal.status == "inconclusive"
    assert journal.advice is not None
    assert "never promote" in journal.advice


def test_exit_six_halts_conflict_with_refork_advice(tmp_path: Path) -> None:
    session, journal, _ = make_session(tmp_path, ScriptedExecutor(default=6))
    record = invoke(session)
    assert record["outcome"] == "conflict"
    assert journal.status == "conflict"
    assert journal.advice is not None
    assert "re-fork" in journal.advice


def test_exit_seven_is_never_retried_even_when_configured(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=7)
    session, journal, sleeper = make_session(tmp_path, executor)
    record = invoke(session, max_retries=5, retry_on_exit_codes=[7, 8])
    assert record["outcome"] == "outcome-unknown"
    assert journal.status == "outcome-unknown"
    assert len(executor.calls) == 1
    assert sleeper.delays == []
    assert journal.advice is not None
    assert "reconcile" in journal.advice.lower()


@pytest.mark.parametrize("code", [2, 9])
def test_exit_two_and_nine_are_fatal(tmp_path: Path, code: int) -> None:
    executor = ScriptedExecutor(default=code)
    session, journal, _ = make_session(tmp_path, executor)
    record = invoke(session)
    assert record["outcome"] == "fatal"
    assert journal.status == "failed"
    assert len(executor.calls) == 1


def test_unknown_exit_code_fails(tmp_path: Path) -> None:
    session, journal, _ = make_session(tmp_path, ScriptedExecutor(default=1))
    record = invoke(session)
    assert record["outcome"] == "failed"
    assert journal.status == "failed"


def test_completed_step_is_skipped_idempotently(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=0)
    session, _, _ = make_session(tmp_path, executor)
    invoke(session)
    record = invoke(session)
    assert record["outcome"] == "already-complete"
    assert len(executor.calls) == 1


def test_r2_step_without_committed_intent_pauses(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=0)
    session, journal, _ = make_session(tmp_path, executor)
    record = invoke(session, action_class="R2")
    assert record["outcome"] == "intent-not-committed"
    assert journal.status == "paused"
    assert executor.calls == []


def test_r2_step_with_committed_intent_runs(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=0)
    session, _, _ = make_session(
        tmp_path, executor, intent_verifier=lambda step_id, action_class: True
    )
    record = invoke(session, action_class="R2")
    assert record["outcome"] == "success"
    assert len(executor.calls) == 1


def test_journal_attempts_are_redacted(tmp_path: Path) -> None:
    executor = ScriptedExecutor(default=0)
    executor.stdout = "leaked ghp-abcdefghijklmnop123456 token"
    session, journal, _ = make_session(tmp_path, executor)
    invoke(session)
    persisted = journal.path.read_text(encoding="utf-8")
    assert "ghp-abcdefghijklmnop123456" not in persisted
    assert "[REDACTED]" in persisted


# ---------------------------------------------------------------------------
# Healing proposals
# ---------------------------------------------------------------------------


def test_heal_proposes_raising_retries_for_exit_eight(
    service: WorkflowService, paths: ProjectPaths
) -> None:
    plan = make_plan()
    service.generate(plan)
    proposal = service.heal(
        plan.workflow_name, failure={"step_id": "step_one", "exit_code": 8}
    )
    assert proposal.patch == {
        "kind": "raise-max-retries",
        "step_id": "step_one",
        "from_value": 0,
        "to_value": 2,
    }
    assert proposal.parent_plan_digest == plan_digest(plan)
    assert proposal.candidate_plan.parent_plan_digest == plan_digest(plan)
    assert proposal.candidate_plan.steps[0].max_retries == 2
    assert proposal.candidate_plan.repairs_applied == [proposal.proposal_id]
    assert Path(proposal.path).is_file()
    # The promoted candidate is accepted by the lineage guard without force.
    service.generate(proposal.candidate_plan)


def test_heal_proposes_approval_for_exit_three(service: WorkflowService) -> None:
    plan = make_plan()
    service.generate(plan)
    proposal = service.heal(
        plan.workflow_name, failure={"step_id": "step_one", "exit_code": 3}
    )
    assert proposal.patch["kind"] == "require-approval"
    assert proposal.candidate_plan.steps[0].require_approval is True


def test_heal_has_no_deterministic_repair_for_fatal_codes(
    service: WorkflowService,
) -> None:
    plan = make_plan()
    service.generate(plan)
    with pytest.raises(InconclusiveError, match="no deterministic repair"):
        service.heal(plan.workflow_name, failure={"step_id": "step_one", "exit_code": 9})
