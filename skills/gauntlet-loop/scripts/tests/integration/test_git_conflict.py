"""Git integration conflict fixture (brief: "Git tests").

Parent and candidate make conflicting source changes; promote-applicability
analysis must report the conflict WITHOUT modifying the target branch: the
target branch commit stays unchanged and no merge commit is created.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.errors import ConflictError
from gauntlet.gitops import GitRunner, WorktreeManager
from gauntlet.paths import ProjectPaths
from gauntlet.support import FrozenClock


def commit_file(runner: GitRunner, worktree: Path, name: str, content: str, message: str) -> str:
    (worktree / name).write_text(content, encoding="utf-8")
    runner.run(["add", "--", name], cwd=worktree)
    runner.run(["commit", "-m", message], cwd=worktree)
    return runner.run(["rev-parse", "HEAD"], cwd=worktree).stdout.strip()


@pytest.fixture()
def conflict_repo(
    git_repo: Path, clock: FrozenClock
) -> tuple[GitRunner, WorktreeManager, str, str]:
    """Repo where parent (main) and candidate change the same source line."""
    runner = GitRunner(git_repo)
    manager = WorktreeManager(ProjectPaths(git_root=git_repo), runner, clock=clock)
    commit_file(runner, git_repo, "src.txt", "shared-baseline-line\n", "add src.txt")
    fork_point = runner.current_commit()
    branch = "gauntlet/campaign-conflict/experiment-conflict"
    runner.create_branch(branch, fork_point)
    record = manager.create("experiment-conflict", branch=branch, parent_commit=fork_point)
    candidate_commit = commit_file(
        runner, record.path, "src.txt", "candidate-version\n", "candidate change"
    )
    commit_file(runner, git_repo, "src.txt", "parent-version\n", "parent change")
    return runner, manager, branch, candidate_commit


class TestGitIntegrationConflict:
    def test_applicability_reports_conflict_without_target_mutation(
        self, conflict_repo: tuple[GitRunner, WorktreeManager, str, str]
    ) -> None:
        runner, _manager, branch, candidate_commit = conflict_repo
        main_before = runner.current_commit("main")
        commit_count_before = runner.run(["rev-list", "--count", "main"]).stdout.strip()

        check = runner.merge_check("main", branch)
        assert not check.applicable
        assert "src.txt" in check.conflicts
        assert check.mode == "write-tree"  # git >= 2.38 on this runner

        with pytest.raises(ConflictError):
            runner.promote_to_new_branch(
                candidate_ref=branch,
                target_branch="main",
                promotion_branch="promotion/experiment-conflict",
                message="must not be created",
            )

        # Target branch commit unchanged and no merge commit created.
        assert runner.current_commit("main") == main_before
        assert runner.run(["rev-list", "--count", "main"]).stdout.strip() == commit_count_before
        merges = runner.run(["rev-list", "--merges", "--count", "--all"]).stdout.strip()
        assert merges == "0"
        assert not runner.branch_exists("promotion/experiment-conflict")
        # The candidate branch and its evidence remain intact.
        assert runner.current_commit(branch) == candidate_commit
        assert branch in runner.list_branches("gauntlet/")

    def test_classic_mode_reports_same_conflict_without_mutation(
        self, conflict_repo: tuple[GitRunner, WorktreeManager, str, str], git_repo: Path
    ) -> None:
        runner, _manager, branch, _candidate_commit = conflict_repo
        classic = GitRunner(git_repo, merge_tree_mode="classic")
        main_before = classic.current_commit("main")
        check = classic.merge_check("main", branch)
        assert check.mode == "classic"
        assert not check.applicable
        assert "src.txt" in check.conflicts
        with pytest.raises(ConflictError):
            classic.promote_to_new_branch(
                candidate_ref=branch,
                target_branch="main",
                promotion_branch="promotion/classic-conflict",
                message="must not be created",
            )
        assert classic.current_commit("main") == main_before
        assert not classic.branch_exists("promotion/classic-conflict")
        assert runner.run(["rev-list", "--merges", "--count", "--all"]).stdout.strip() == "0"
