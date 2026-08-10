"""Experiment lifecycle against a real temporary Git repository."""

from __future__ import annotations

import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import pytest

from gauntlet.campaigns import CampaignService, RecordingEventEmitter
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ActionSeam, ExperimentStatus
from gauntlet.errors import (
    ApprovalRequiredError,
    GateFailedError,
    InvalidInvocationError,
)
from gauntlet.experiments import (
    ArchiveEntry,
    ExperimentService,
    MemoryBlobSink,
    non_dominated,
)
from gauntlet.gitops import GitRunner, WorktreeManager
from gauntlet.ledger import LedgerStore
from gauntlet.models import BudgetV1, HypothesisV1, StopPolicyV1
from gauntlet.paths import ProjectPaths
from gauntlet.support import FrozenClock, SequentialIdGenerator, SubprocessRunner

WRITE_SRC = [
    sys.executable,
    "-c",
    "from pathlib import Path; Path('src.txt').write_text('improved\\n')",
]
WRITE_README = [
    sys.executable,
    "-c",
    "from pathlib import Path; Path('README.md').write_text('tampered\\n')",
]
WRITE_FROZEN = [
    sys.executable,
    "-c",
    "from pathlib import Path; p = Path('.gauntlet/policies'); p.mkdir(parents=True); "
    "(p / 'evil.yaml').write_text('weakened\\n')",
]
FAILING = [sys.executable, "-c", "raise SystemExit(3)"]


@dataclass
class Stack:
    repo: Path
    paths: ProjectPaths
    git: GitRunner
    clock: FrozenClock
    ids: SequentialIdGenerator
    campaigns: CampaignService
    experiments: ExperimentService
    emitter: RecordingEventEmitter
    blobs: MemoryBlobSink
    campaign_id: str


def make_stack(
    git_repo: Path,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    *,
    max_experiments: int = 5,
) -> Stack:
    paths = ProjectPaths(git_root=git_repo)
    git = GitRunner(git_repo)
    (git_repo / "src.txt").write_text("original\n", encoding="utf-8")
    git.run(["add", "--", "src.txt"])
    git.run(["commit", "-m", "add src.txt"])
    ledger = LedgerStore(paths.ledger_dir)
    emitter = RecordingEventEmitter()
    blobs = MemoryBlobSink()
    campaigns = CampaignService(
        paths, clock=clock, ids=ids, git=git, ledger=ledger, emitter=emitter
    )
    worktrees = WorktreeManager(paths, git, clock=clock)
    experiments = ExperimentService(
        paths,
        clock=clock,
        ids=ids,
        git=git,
        worktrees=worktrees,
        campaigns=campaigns,
        runner=SubprocessRunner(),
        ledger=ledger,
        emitter=emitter,
        blobs=blobs,
        skill_root=git_repo / "skills" / "gauntlet-loop",
    )
    campaign = campaigns.start(
        objective="improve src.txt",
        spec_digest=digest_value({"spec": "frozen"}),
        spec_frozen=True,
        budget=BudgetV1(max_experiments=max_experiments),
        stop_policy=StopPolicyV1(hard_budget=BudgetV1(max_experiments=max_experiments)),
        baseline_commit=git.current_commit(),
        target_branch="main",
    )
    return Stack(
        repo=git_repo,
        paths=paths,
        git=git,
        clock=clock,
        ids=ids,
        campaigns=campaigns,
        experiments=experiments,
        emitter=emitter,
        blobs=blobs,
        campaign_id=campaign.campaign_id,
    )


@pytest.fixture()
def stack(git_repo: Path, clock: FrozenClock, ids: SequentialIdGenerator) -> Stack:
    return make_stack(git_repo, clock, ids)


def make_hypothesis(stack: Stack) -> HypothesisV1:
    return HypothesisV1(
        hypothesis_id=stack.ids.new_id("hypothesis"),
        campaign_id=stack.campaign_id,
        statement="rewriting src.txt with the deterministic operator fixes the defect",
        falsifier="src.txt still fails the content invariant after the rewrite",
        seam=ActionSeam.DETERMINISTIC_OPERATOR,
        created_at=stack.clock.now(),
    )


def propose(
    stack: Stack,
    *,
    permitted: Sequence[str] = ("src.txt",),
    commands: Sequence[Sequence[str]] = (WRITE_SRC,),
    smoke_only: bool = False,
) -> str:
    experiment = stack.experiments.propose(
        stack.campaign_id,
        make_hypothesis(stack),
        permitted_globs=list(permitted),
        commands=list(commands),
        smoke_only=smoke_only,
    )
    return experiment.experiment_id


class TestLifecycle:
    def test_propose_fork_run_compare_keep(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        proposed = stack.experiments.load(experiment_id)
        assert proposed.status is ExperimentStatus.PROPOSED
        assert proposed.branch.startswith("gauntlet/campaign-000001/")
        forked = stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        assert forked.fork_event == "event:fork-000001"
        assert forked.worktree_manifest is not None
        assert stack.git.branch_exists(proposed.branch)
        report = stack.experiments.run(experiment_id)
        assert report.changed_paths == ("src.txt",)
        assert report.candidate_commit is not None
        assert report.experiment.commits == [report.candidate_commit]
        assert report.executions[0].exit_code == 0
        assert report.executions[0].stdout_digest in stack.blobs.blobs
        comparison = stack.experiments.compare(
            experiment_id,
            baseline_candidate_id="candidate:baseline",
            candidate_id="candidate:000001",
            baseline_metrics={"accuracy": [0.5, 0.6]},
            candidate_metrics={"accuracy": [0.7, 0.8]},
            interval_fn=lambda metric, base, cand: (0.1, 0.3),
        )
        assert comparison.deltas[0].value == pytest.approx(0.2)
        assert comparison.inconclusive is False
        kept = stack.experiments.keep(experiment_id, rationale="clean win on search cases")
        assert kept.status is ExperimentStatus.KEEP
        # keep never auto-promotes: no promotion branch, target untouched.
        assert stack.git.list_branches("promotion") == []
        assert stack.git.current_branch() == "main"

    def test_fork_records_external_worktree(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        manifest = stack.paths.workspace_manifests_dir / "experiment-000001.json"
        local = stack.paths.workspace_manifests_dir / "experiment-000001.local.json"
        assert manifest.is_file()
        assert local.is_file()

    def test_run_requires_fork(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        with pytest.raises(InvalidInvocationError):
            stack.experiments.run(experiment_id)

    def test_crash_recorded_with_rationale(self, stack: Stack) -> None:
        experiment_id = propose(stack, commands=(FAILING,))
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        report = stack.experiments.run(experiment_id)
        assert report.experiment.status is ExperimentStatus.CRASH
        assert report.experiment.status_rationale
        assert report.executions[0].exit_code == 3


class TestMutationSurface:
    def test_propose_requires_permitted_globs(self, stack: Stack) -> None:
        with pytest.raises(InvalidInvocationError):
            propose(stack, permitted=())

    def test_propose_refuses_frozen_intersection(self, stack: Stack) -> None:
        with pytest.raises(GateFailedError):
            propose(stack, permitted=(".gauntlet/policies/**",))
        with pytest.raises(GateFailedError):
            propose(stack, permitted=("**",))

    def test_candidate_touching_unpermitted_file_fails_gate(self, stack: Stack) -> None:
        experiment_id = propose(stack, commands=(WRITE_README,))
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        with pytest.raises(GateFailedError) as excinfo:
            stack.experiments.run(experiment_id)
        # Counterexample-ready detail: candidate, branch, rule, exact paths.
        message = str(excinfo.value)
        assert experiment_id in message
        assert "gauntlet/campaign-000001" in message
        assert "README.md" in message
        assert "violated_rule=" in message
        blocked = stack.experiments.load(experiment_id)
        assert blocked.status is ExperimentStatus.BLOCKED
        assert any(
            event_type == "dev.gauntlet.counterexample.created.v1"
            for event_type, _ in stack.emitter.events
        )

    def test_candidate_touching_frozen_surface_fails_gate(self, stack: Stack) -> None:
        experiment_id = propose(stack, commands=(WRITE_FROZEN,))
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        with pytest.raises(GateFailedError) as excinfo:
            stack.experiments.run(experiment_id)
        assert ".gauntlet/policies/evil.yaml" in str(excinfo.value)


class TestSmokeRuns:
    def test_smoke_run_cannot_conclude_hypotheses(self, stack: Stack) -> None:
        experiment_id = propose(stack, smoke_only=True)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        report = stack.experiments.run(experiment_id)
        assert report.experiment.smoke_only is True
        stack.experiments.compare(
            experiment_id,
            baseline_candidate_id="candidate:baseline",
            candidate_id="candidate:smoke",
            baseline_metrics={"accuracy": [0.5]},
            candidate_metrics={"accuracy": [0.9]},
        )
        with pytest.raises(GateFailedError):
            stack.experiments.keep(experiment_id, rationale="looks great")
        with pytest.raises(GateFailedError):
            stack.experiments.discard(experiment_id, rationale="looks bad")
        concluded = stack.experiments.mark_inconclusive(
            experiment_id, rationale="plumbing check only; not hypothesis evidence"
        )
        assert concluded.status is ExperimentStatus.INCONCLUSIVE


class TestBudgets:
    def test_budget_exhaustion_blocks_new_runs(
        self, git_repo: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        stack = make_stack(git_repo, clock, ids, max_experiments=1)
        first = propose(stack)
        stack.experiments.fork(first, fork_event_id="event:fork-000001")
        stack.experiments.run(first)
        second = propose(stack)
        stack.experiments.fork(second, fork_event_id="event:fork-000002")
        with pytest.raises(GateFailedError) as excinfo:
            stack.experiments.run(second)
        assert "budget" in str(excinfo.value)

    def test_costly_experiment_requires_committed_intent(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        with pytest.raises(ApprovalRequiredError):
            stack.experiments.run(experiment_id, costly=True)


class TestConclusions:
    def test_discard_preserves_branch_and_evidence(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        stack.experiments.run(experiment_id)
        branch = stack.experiments.load(experiment_id).branch
        discarded = stack.experiments.discard(
            experiment_id,
            rationale="no measurable improvement",
            evidence=["observation:000001"],
        )
        assert discarded.status is ExperimentStatus.DISCARD
        assert discarded.status_rationale == "no measurable improvement"
        assert branch in stack.git.list_branches("gauntlet/")
        assert "observation:000001" in stack.experiments.load(experiment_id).observation_refs

    def test_conclusions_require_rationale(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        stack.experiments.run(experiment_id)
        with pytest.raises(InvalidInvocationError):
            stack.experiments.mark_crash(experiment_id, rationale="  ")
        with pytest.raises(InvalidInvocationError):
            stack.experiments.mark_inconclusive(experiment_id, rationale="")
        with pytest.raises(InvalidInvocationError):
            stack.experiments.discard(experiment_id, rationale=" ")

    def test_keep_requires_comparison(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        stack.experiments.run(experiment_id)
        with pytest.raises(InvalidInvocationError):
            stack.experiments.keep(experiment_id, rationale="no comparison yet")


class TestCompare:
    def test_missing_bounds_marks_inconclusive(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        stack.experiments.run(experiment_id)
        comparison = stack.experiments.compare(
            experiment_id,
            baseline_candidate_id="candidate:baseline",
            candidate_id="candidate:000001",
            baseline_metrics={"accuracy": [0.5, 0.6]},
            candidate_metrics={"accuracy": [0.7, 0.8]},
            minimum_practical_effect=0.05,
        )
        assert comparison.inconclusive is True
        assert comparison.deltas[0].lower_bound is None
        without_mpe = stack.experiments.compare(
            experiment_id,
            baseline_candidate_id="candidate:baseline",
            candidate_id="candidate:000001",
            baseline_metrics={"accuracy": [0.5]},
            candidate_metrics={"accuracy": [0.7]},
        )
        assert without_mpe.inconclusive is False

    def test_compare_requires_completed_run_and_paired_samples(self, stack: Stack) -> None:
        experiment_id = propose(stack)
        with pytest.raises(InvalidInvocationError):
            stack.experiments.compare(
                experiment_id,
                baseline_candidate_id="candidate:a",
                candidate_id="candidate:b",
                baseline_metrics={"accuracy": [0.5]},
                candidate_metrics={"accuracy": [0.6]},
            )
        stack.experiments.fork(experiment_id, fork_event_id="event:fork-000001")
        stack.experiments.run(experiment_id)
        with pytest.raises(InvalidInvocationError):
            stack.experiments.compare(
                experiment_id,
                baseline_candidate_id="candidate:a",
                candidate_id="candidate:b",
                baseline_metrics={"accuracy": [0.5, 0.6]},
                candidate_metrics={"accuracy": [0.6]},
            )


class TestArchive:
    def _entries(self) -> list[ArchiveEntry]:
        return [
            ArchiveEntry(
                experiment_id="experiment:a",
                behavior={"pathology": "off-by-one"},
                metrics={"accuracy": 1.0, "speed": 1.0},
            ),
            ArchiveEntry(
                experiment_id="experiment:b",
                behavior={"pathology": "timeout"},
                metrics={"accuracy": 2.0, "speed": 0.5},
            ),
            ArchiveEntry(
                experiment_id="experiment:c",
                behavior={"pathology": "off-by-one"},
                metrics={"accuracy": 0.5, "speed": 0.5},
            ),
        ]

    def test_non_dominance_is_deterministic(self) -> None:
        entries = self._entries()
        front = non_dominated(entries)
        assert [entry.experiment_id for entry in front] == ["experiment:a", "experiment:b"]
        assert non_dominated(list(reversed(entries))) == front

    def test_mismatched_metric_keys_rejected(self) -> None:
        entries = self._entries()
        entries.append(
            ArchiveEntry(experiment_id="experiment:d", behavior={}, metrics={"other": 1.0})
        )
        with pytest.raises(InvalidInvocationError):
            non_dominated(entries)

    def test_archive_record_written_deterministically(self, stack: Stack) -> None:
        target = stack.experiments.archive(stack.campaign_id, self._entries())
        assert target.is_file()
        text = target.read_text(encoding="utf-8")
        assert '"pareto_front":["experiment:a","experiment:b"]' in text
        assert '"non_dominated":false' in text


class TestRepairDistillation:
    def _kept(self, stack: Stack, count: int) -> list[object]:
        experiments = []
        for _ in range(count):
            experiment_id = propose(stack)
            experiment = stack.experiments.load(experiment_id).model_copy(
                update={"status": ExperimentStatus.KEEP}
            )
            experiments.append(experiment)
        return experiments

    def test_recurring_repair_yields_advisory_proposal(self, stack: Stack) -> None:
        kept = self._kept(stack, 3)
        proposal = stack.experiments.propose_repair_distillation(
            kept,  # type: ignore[arg-type]
            repair_pattern="normalize-line-endings-before-diff",
        )
        assert proposal is not None
        assert proposal["kind"] == "operator-distillation-proposal"
        assert proposal["advisory_only"] is True
        assert proposal["escalation_stage"] == "repeatedly-validated-deterministic-operator"
        assert proposal["occurrences"] == 3

    def test_no_proposal_below_recurrence_threshold(self, stack: Stack) -> None:
        kept = self._kept(stack, 2)
        proposal = stack.experiments.propose_repair_distillation(
            kept,  # type: ignore[arg-type]
            repair_pattern="normalize-line-endings-before-diff",
        )
        assert proposal is None
