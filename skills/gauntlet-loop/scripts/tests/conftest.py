"""Shared deterministic fixtures for the gauntlet test suites."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from gauntlet.support import FrozenClock, SequentialIdGenerator


@pytest.fixture()
def clock() -> FrozenClock:
    return FrozenClock()


@pytest.fixture()
def ids() -> SequentialIdGenerator:
    return SequentialIdGenerator()


def _git(repo: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=60,
        check=True,
        env={
            "PATH": "/usr/bin:/bin:/usr/local/bin",
            "GIT_AUTHOR_NAME": "gauntlet-test",
            "GIT_AUTHOR_EMAIL": "gauntlet-test@example.invalid",
            "GIT_COMMITTER_NAME": "gauntlet-test",
            "GIT_COMMITTER_EMAIL": "gauntlet-test@example.invalid",
            "HOME": str(repo),
        },
    )
    return completed.stdout.strip()


@pytest.fixture()
def git_repo(tmp_path: Path) -> Path:
    """A real temporary Git repository with one baseline commit."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "--initial-branch=main")
    (repo / "README.md").write_text("baseline\n", encoding="utf-8")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "baseline")
    return repo


@pytest.fixture()
def git() -> object:
    """Expose the raw test git helper for suites that need extra commands."""
    return _git
