"""Project initialization, doctor, status, and migration behavior."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
import yaml

import gauntlet
from gauntlet.errors import InvalidInvocationError
from gauntlet.project import doctor, init_project, migrate, project_status


def _git_status_lines(repo: Path) -> list[str]:
    completed = subprocess.run(
        ["git", "status", "--porcelain", "--ignored=matching", "-uall"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=True,
    )
    return completed.stdout.splitlines()


class TestInit:
    def test_refuses_outside_git_without_flag(self, tmp_path: Path) -> None:
        bare = tmp_path / "no-git"
        bare.mkdir()
        with pytest.raises(InvalidInvocationError):
            init_project(start=bare)

    def test_allow_no_git(self, tmp_path: Path) -> None:
        bare = tmp_path / "no-git"
        bare.mkdir()
        report = init_project(start=bare, allow_no_git=True)
        assert (bare / ".gauntlet" / "config.yaml").is_file()
        assert report.project_id is not None

    def test_creates_structure_and_replaces_sentinels(self, git_repo: Path) -> None:
        report = init_project(start=git_repo)
        config_text = (git_repo / ".gauntlet" / "config.yaml").read_text(encoding="utf-8")
        assert "${GENERATED_PROJECT_UUID}" not in config_text
        assert report.project_id is not None and report.project_id in config_text
        version = (git_repo / ".gauntlet" / "VERSION").read_text(encoding="utf-8").strip()
        assert version == gauntlet.__version__
        schemas = list((git_repo / ".gauntlet" / "schemas").glob("*.schema.json"))
        assert len(schemas) > 40

    def test_idempotent_and_preserves_existing(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        config = git_repo / ".gauntlet" / "config.yaml"
        original = config.read_text(encoding="utf-8")
        edited = original.replace("profile: software", "profile: research")
        config.write_text(edited, encoding="utf-8")
        report = init_project(start=git_repo)
        assert config.read_text(encoding="utf-8") == edited
        assert "config.yaml" in report.conflicts

    def test_root_gitignore_untouched_by_default(self, git_repo: Path) -> None:
        root_ignore = git_repo / ".gitignore"
        root_ignore.write_text("node_modules/\n", encoding="utf-8")
        init_project(start=git_repo)
        assert root_ignore.read_text(encoding="utf-8") == "node_modules/\n"

    def test_worktree_root_created_outside_repo(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        sibling = git_repo.parent / f".{git_repo.name}.gauntlet-worktrees"
        assert sibling.is_dir()


class TestGitignoreSemantics:
    def test_tracked_vs_ignored_partition(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        gauntlet_dir = git_repo / ".gauntlet"
        (gauntlet_dir / "state" / "activegraph.sqlite3").write_bytes(b"db")
        (gauntlet_dir / "secrets" / "token.txt").write_text("fake-token", encoding="utf-8")
        (gauntlet_dir / "secrets" / "id_rsa.key").write_text("fake-key", encoding="utf-8")
        (gauntlet_dir / "datasets" / "promotion" / "sealed" / "case1.json").write_text(
            "{}", encoding="utf-8"
        )
        (gauntlet_dir / "artifacts" / "blobs" / "deadbeef").write_bytes(b"blob")
        (gauntlet_dir / "config.local.yaml").write_text("{}", encoding="utf-8")
        (gauntlet_dir / "traces" / "raw.jsonl").write_text("{}", encoding="utf-8")

        subprocess.run(["git", "add", "-A"], cwd=git_repo, capture_output=True, check=True)
        staged = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=git_repo,
            capture_output=True,
            text=True,
            check=True,
        ).stdout

        # Never staged: runtime DB, secrets, sealed cases, blobs, overrides.
        assert "activegraph.sqlite3" not in staged
        assert "token.txt" not in staged
        assert "id_rsa.key" not in staged
        assert "sealed/case1.json" not in staged
        assert "blobs/deadbeef" not in staged
        assert "config.local.yaml" not in staged
        assert "traces/raw.jsonl" not in staged

        # Tracked: normative config, policies, schemas, ledger, and README
        # placeholders inside ignored directories.
        assert ".gauntlet/config.yaml" in staged
        assert ".gauntlet/policies/authority.yaml" in staged
        assert ".gauntlet/schemas/manifest.yaml" in staged
        assert ".gauntlet/state/README.md" in staged
        assert ".gauntlet/secrets/README.md" in staged
        assert ".gauntlet/datasets/promotion/sealed/README.md" in staged
        assert ".gauntlet/artifacts/blobs/README.md" in staged


class TestDoctorStatusMigrate:
    def test_doctor_passes_on_initialized_project(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        failures = [check.name for check in doctor(start=git_repo) if not check.passed]
        assert failures == []

    def test_status_reports_project(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        status = project_status(start=git_repo)
        assert status["initialized"] is True
        assert status["project_id"]

    def test_migrate_check_is_clean_after_init(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        report = migrate(start=git_repo, apply=False)
        assert report["pending"] is False

    def test_migrate_applies_with_backup_and_archive(self, git_repo: Path) -> None:
        init_project(start=git_repo)
        gauntlet_dir = git_repo / ".gauntlet"
        (gauntlet_dir / "VERSION").write_text("0.0.1\n", encoding="utf-8")
        (gauntlet_dir / "state" / "activegraph.sqlite3").write_bytes(b"olddb")
        report = migrate(start=git_repo, apply=True)
        assert report["applied"] is True
        assert "backup" in report
        assert (gauntlet_dir / "schemas" / "archived-0.0.1").is_dir()
        assert (
            gauntlet_dir / "VERSION"
        ).read_text(encoding="utf-8").strip() == gauntlet.__version__

    def test_config_parses_as_model(self, git_repo: Path) -> None:
        from gauntlet.models import ProjectConfigV1

        init_project(start=git_repo)
        config = yaml.safe_load(
            (git_repo / ".gauntlet" / "config.yaml").read_text(encoding="utf-8")
        )
        parsed = ProjectConfigV1.model_validate(config)
        assert parsed.runtime.authority_ceiling.value == "R1"
