"""Git tests over real temporary repositories (see brief: "Git tests")."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pytest

from gauntlet.errors import ConflictError, InvalidInvocationError, SecurityViolationError
from gauntlet.gitops import (
    GitRunner,
    WorktreeManager,
    check_change_scope,
    expand_frozen_surfaces,
    frozen_permitted_intersection,
    glob_match,
    globs_may_intersect,
    slugify,
)
from gauntlet.paths import ProjectPaths
from gauntlet.support import CompletedProcess, FrozenClock, SubprocessRunner


@dataclass
class RecordingRunner:
    """ProcessRunner wrapper recording every constructed argv."""

    inner: SubprocessRunner = field(default_factory=SubprocessRunner)
    calls: list[tuple[str, ...]] = field(default_factory=list)

    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess:
        self.calls.append(tuple(argv))
        return self.inner.run(
            argv,
            cwd=cwd,
            env=env,
            timeout_seconds=timeout_seconds,
            max_output_bytes=max_output_bytes,
        )


@pytest.fixture()
def recorder() -> RecordingRunner:
    return RecordingRunner()


@pytest.fixture()
def runner(git_repo: Path, recorder: RecordingRunner) -> GitRunner:
    return GitRunner(git_repo, recorder)


@pytest.fixture()
def manager(git_repo: Path, runner: GitRunner, clock: FrozenClock) -> WorktreeManager:
    return WorktreeManager(ProjectPaths(git_root=git_repo), runner, clock=clock)


def commit_file(runner: GitRunner, worktree: Path, name: str, content: str, message: str) -> str:
    (worktree / name).write_text(content, encoding="utf-8")
    runner.run(["add", "--", name], cwd=worktree)
    runner.run(["commit", "-m", message], cwd=worktree)
    return runner.run(["rev-parse", "HEAD"], cwd=worktree).stdout.strip()


class TestBranchesAndWorktrees:
    def test_branch_and_worktree_bound_to_experiment_id(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        baseline = runner.current_commit()
        branch = "gauntlet/campaign-000001/experiment-000001"
        runner.create_branch(branch, baseline)
        record = manager.create(
            "experiment-000001", branch=branch, parent_commit=baseline, experiment_id="e-1"
        )
        assert record.workspace_id == "experiment-000001"
        assert record.path.is_dir()
        assert runner.current_branch(cwd=record.path) == branch
        assert record.commit == baseline
        assert record.parent_commit == baseline
        # Tracked manifest carries branch/commit/parent + sanitized id.
        tracked = record.tracked_manifest.read_text(encoding="utf-8")
        assert branch in tracked
        assert baseline in tracked
        assert str(record.path) not in tracked
        # Absolute local path lives only in the ignored local manifest.
        local = record.local_manifest.read_text(encoding="utf-8")
        assert str(record.path.resolve()) in local
        gitignore = record.local_manifest.parent / ".gitignore"
        assert "*.local.json" in gitignore.read_text(encoding="utf-8")

    def test_worktree_created_outside_main_worktree(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        baseline = runner.current_commit()
        runner.create_branch("gauntlet/c/e", baseline)
        record = manager.create("exp-outside", branch="gauntlet/c/e", parent_commit=baseline)
        assert not record.path.resolve().is_relative_to(git_repo.resolve())
        assert record.path.resolve().is_relative_to(
            ProjectPaths(git_root=git_repo).worktree_root().resolve()
        )

    def test_only_owned_worktrees_removable(
        self, git_repo: Path, tmp_path: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        baseline = runner.current_commit()
        runner.create_branch("gauntlet/c/owned", baseline)
        record = manager.create("owned", branch="gauntlet/c/owned", parent_commit=baseline)
        # A path that is not a project worktree at all.
        foreign = tmp_path / "not-a-worktree"
        foreign.mkdir()
        with pytest.raises(SecurityViolationError):
            manager.remove_worktree_path(foreign)
        # A real registered worktree without a gauntlet manifest is refused.
        runner.create_branch("gauntlet/c/unmanaged", baseline)
        unmanaged = ProjectPaths(git_root=git_repo).worktree_root() / "unmanaged"
        runner.worktree_add(unmanaged, "gauntlet/c/unmanaged")
        with pytest.raises(SecurityViolationError):
            manager.remove_worktree_path(unmanaged)
        assert unmanaged.is_dir()
        # The owned worktree is removable through git worktree remove.
        manager.remove(record.workspace_id)
        assert not record.path.exists()
        assert not record.local_manifest.exists()
        assert record.tracked_manifest.exists()

    def test_rejected_branch_remains_after_worktree_removal(
        self, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        baseline = runner.current_commit()
        branch = "gauntlet/campaign-x/rejected-exp"
        runner.create_branch(branch, baseline)
        record = manager.create("rejected-exp", branch=branch, parent_commit=baseline)
        manager.remove(record.workspace_id)
        assert branch in runner.list_branches("gauntlet/")

    def test_dirty_unrelated_work_preserved(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        precious = git_repo / "precious-notes.txt"
        precious.write_text("do not lose me\n", encoding="utf-8")
        (git_repo / "README.md").write_text("locally edited baseline\n", encoding="utf-8")
        baseline = runner.current_commit()
        runner.create_branch("gauntlet/c/dirty-safe", baseline)
        record = manager.create(
            "dirty-safe",
            branch="gauntlet/c/dirty-safe",
            parent_commit=baseline,
            permitted_globs=["src/**"],
        )
        commit_file(runner, record.path, "src-change.txt", "candidate\n", "candidate work")
        manager.remove(record.workspace_id, force=True)
        assert precious.read_text(encoding="utf-8") == "do not lose me\n"
        assert (git_repo / "README.md").read_text(encoding="utf-8") == "locally edited baseline\n"
        assert "precious-notes.txt" in runner.dirty_paths()
        assert "README.md" in runner.dirty_paths()

    def test_dirty_overlap_refused_without_isolation(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        (git_repo / "README.md").write_text("dirty overlapping edit\n", encoding="utf-8")
        baseline = runner.current_commit()
        runner.create_branch("gauntlet/c/overlap", baseline)
        with pytest.raises(ConflictError):
            manager.create(
                "overlap",
                branch="gauntlet/c/overlap",
                parent_commit=baseline,
                permitted_globs=["README.md"],
                isolate=False,
            )
        # The default (a clean external worktree) isolates the experiment.
        record = manager.create(
            "overlap",
            branch="gauntlet/c/overlap",
            parent_commit=baseline,
            permitted_globs=["README.md"],
        )
        assert (record.path / "README.md").read_text(encoding="utf-8") == "baseline\n"


class TestMergeAnalysis:
    def _conflict_fixture(self, git_repo: Path, runner: GitRunner, manager: WorktreeManager) -> str:
        commit_file(runner, git_repo, "src.txt", "line-one\n", "add src")
        baseline = runner.current_commit()
        branch = "gauntlet/c/conflicting"
        runner.create_branch(branch, baseline)
        record = manager.create("conflicting", branch=branch, parent_commit=baseline)
        commit_file(runner, record.path, "src.txt", "candidate-line\n", "candidate edit")
        commit_file(runner, git_repo, "src.txt", "parent-line\n", "parent edit")
        return branch

    def test_conflict_detected_before_target_mutation(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        branch = self._conflict_fixture(git_repo, runner, manager)
        main_before = runner.current_commit("main")
        check = runner.merge_check("main", branch)
        assert not check.applicable
        assert "src.txt" in check.conflicts
        assert check.mode == "write-tree"
        with pytest.raises(ConflictError):
            runner.promote_to_new_branch(
                candidate_ref=branch,
                target_branch="main",
                promotion_branch="promotion/conflicting",
                message="should never happen",
            )
        assert runner.current_commit("main") == main_before
        assert not runner.branch_exists("promotion/conflicting")

    def test_classic_merge_tree_fallback_detects_conflict(
        self, git_repo: Path, recorder: RecordingRunner, clock: FrozenClock
    ) -> None:
        classic = GitRunner(git_repo, recorder, merge_tree_mode="classic")
        manager = WorktreeManager(ProjectPaths(git_root=git_repo), classic, clock=clock)
        branch = self._conflict_fixture(git_repo, classic, manager)
        check = classic.merge_check("main", branch)
        assert check.mode == "classic"
        assert not check.applicable
        assert "src.txt" in check.conflicts

    def test_clean_promotion_lands_on_new_branch_only(
        self, git_repo: Path, runner: GitRunner, manager: WorktreeManager
    ) -> None:
        baseline = runner.current_commit()
        branch = "gauntlet/c/clean"
        runner.create_branch(branch, baseline)
        record = manager.create("clean", branch=branch, parent_commit=baseline)
        commit_file(runner, record.path, "feature.txt", "new feature\n", "candidate feature")
        main_before = runner.current_commit("main")
        outcome = runner.promote_to_new_branch(
            candidate_ref=branch,
            target_branch="main",
            promotion_branch="promotion/clean",
            message="promote clean candidate",
        )
        assert outcome.mode in {"write-tree", "classic"}
        assert runner.branch_exists("promotion/clean")
        parents = runner.run(["rev-list", "--parents", "-n", "1", outcome.commit]).stdout.split()
        assert len(parents) == 3  # merge commit with two parents
        assert runner.current_commit("main") == main_before
        assert runner.current_branch() == "main"

    def test_classic_promotion_lands_on_new_branch_only(
        self, git_repo: Path, clock: FrozenClock
    ) -> None:
        classic = GitRunner(git_repo, merge_tree_mode="classic")
        manager = WorktreeManager(ProjectPaths(git_root=git_repo), classic, clock=clock)
        baseline = classic.current_commit()
        classic.create_branch("gauntlet/c/classic-clean", baseline)
        record = manager.create(
            "classic-clean", branch="gauntlet/c/classic-clean", parent_commit=baseline
        )
        commit_file(classic, record.path, "classic.txt", "feature\n", "candidate")
        main_before = classic.current_commit("main")
        outcome = classic.promote_to_new_branch(
            candidate_ref="gauntlet/c/classic-clean",
            target_branch="main",
            promotion_branch="promotion/classic",
            message="promote classic",
        )
        assert outcome.mode == "classic"
        assert classic.current_commit("main") == main_before
        assert classic.branch_exists("promotion/classic")


class TestNoDestructiveGit:
    def test_forbidden_subcommands_never_constructed(
        self, git_repo: Path, recorder: RecordingRunner, runner: GitRunner, clock: FrozenClock
    ) -> None:
        manager = WorktreeManager(ProjectPaths(git_root=git_repo), runner, clock=clock)
        baseline = runner.current_commit()
        runner.create_branch("gauntlet/c/audit", baseline)
        record = manager.create("audit", branch="gauntlet/c/audit", parent_commit=baseline)
        commit_file(runner, record.path, "audited.txt", "x\n", "candidate")
        runner.promote_to_new_branch(
            candidate_ref="gauntlet/c/audit",
            target_branch="main",
            promotion_branch="promotion/audit",
            message="audit promotion",
        )
        manager.remove(record.workspace_id, force=True)
        forbidden = {"reset", "stash", "clean", "push", "filter-branch"}
        for argv in recorder.calls:
            assert argv[0] == "git"
            assert argv[1] not in forbidden, f"destructive git call constructed: {argv}"
            assert "--force-with-lease" not in argv

    def test_forbidden_subcommands_raise(self, runner: GitRunner) -> None:
        for args in (["reset", "--hard"], ["push", "--force"], ["stash"], ["clean", "-fd"]):
            with pytest.raises(SecurityViolationError):
                runner.run(args)


class TestRefSafety:
    def test_ref_option_injection_rejected(self, runner: GitRunner) -> None:
        for ref in ("-rf", "--upload-pack=/bin/sh", "-", "--output=/tmp/x"):
            with pytest.raises(SecurityViolationError):
                runner.validate_ref(ref)
        with pytest.raises(SecurityViolationError):
            runner.create_branch("-evil", "HEAD")
        with pytest.raises(SecurityViolationError):
            runner.diff_name_only("--exec=sh", "HEAD")

    def test_unknown_ref_rejected(self, runner: GitRunner) -> None:
        with pytest.raises(InvalidInvocationError):
            runner.validate_ref("does-not-exist")

    def test_valid_ref_resolves_to_commit(self, runner: GitRunner) -> None:
        commit = runner.validate_ref("main")
        assert len(commit) == 40


class TestFrozenSurfaces:
    def test_glob_semantics(self) -> None:
        assert glob_match("a/b/c.py", "a/**")
        assert glob_match("b.py", "*.py")
        assert not glob_match("a/b.py", "*.py")
        assert glob_match("x/y/z.txt", "**/z.txt")
        assert glob_match("z.txt", "**/z.txt")
        assert not glob_match("x/y/other.txt", "**/z.txt")

    def test_skill_root_placeholder_expanded(self, git_repo: Path) -> None:
        skill_root = git_repo / "skills" / "gauntlet-loop"
        surfaces = expand_frozen_surfaces(git_root=git_repo, skill_root=skill_root)
        assert "skills/gauntlet-loop/scripts/gauntlet/promotion.py" in surfaces
        assert ".gauntlet/policies/**" in surfaces
        assert not any("<skill-root>" in surface for surface in surfaces)

    def test_out_of_repo_skill_root_patterns_dropped(self, git_repo: Path, tmp_path: Path) -> None:
        surfaces = expand_frozen_surfaces(git_root=git_repo, skill_root=tmp_path / "elsewhere")
        assert not any("promotion.py" in surface for surface in surfaces)
        assert ".gauntlet/policies/**" in surfaces

    def test_change_scope_violations(self, git_repo: Path) -> None:
        surfaces = expand_frozen_surfaces(
            git_root=git_repo, skill_root=git_repo / "skills" / "gauntlet-loop"
        )
        report = check_change_scope(
            [
                "skills/gauntlet-loop/scripts/gauntlet/promotion.py",
                ".gauntlet/policies/promotion.yaml",
                "src/app.py",
            ],
            permitted_globs=["src/**"],
            frozen_surfaces=surfaces,
        )
        assert ".gauntlet/policies/promotion.yaml" in report.frozen_violations
        assert "skills/gauntlet-loop/scripts/gauntlet/promotion.py" in report.frozen_violations
        assert "src/app.py" not in report.frozen_violations
        assert "src/app.py" not in report.outside_permitted
        assert not report.ok
        clean = check_change_scope(
            ["src/app.py"], permitted_globs=["src/**"], frozen_surfaces=surfaces
        )
        assert clean.ok

    def test_permitted_frozen_intersection(self, git_repo: Path) -> None:
        surfaces = expand_frozen_surfaces(
            git_root=git_repo, skill_root=git_repo / "skills" / "gauntlet-loop"
        )
        assert frozen_permitted_intersection([".gauntlet/**"], surfaces)
        assert frozen_permitted_intersection(["**"], surfaces)
        assert not frozen_permitted_intersection(["src/**", "docs/*.md"], surfaces)
        assert globs_may_intersect(".gauntlet/**", ".gauntlet/policies/**")
        assert not globs_may_intersect("src/**", ".gauntlet/policies/**")


class TestSlug:
    def test_slugify(self) -> None:
        assert slugify("campaign:000001") == "campaign-000001"
        assert slugify("Experiment:A/B") == "experiment-a-b"
        with pytest.raises(InvalidInvocationError):
            slugify("///")
