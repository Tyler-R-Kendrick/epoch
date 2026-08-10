"""Deterministic root discovery and safe path handling.

Every project path is anchored to the resolved Git root. Path traversal,
absolute escapes, and symlink escapes out of ``.gauntlet/`` are rejected at
this boundary so callers never concatenate paths ad hoc.
"""

from __future__ import annotations

import os
import subprocess  # noqa: S404 - argv-array execution only, never shell=True
from dataclasses import dataclass
from importlib import resources
from pathlib import Path

from gauntlet.constants import PROJECT_DIR_NAME
from gauntlet.errors import InvalidInvocationError, SecurityViolationError


def find_git_root(start: Path | None = None) -> Path | None:
    """Resolve the Git root via ``git rev-parse`` without trusting the cwd."""
    origin = (start or Path.cwd()).resolve()
    try:
        completed = subprocess.run(  # noqa: S603
            ["git", "rev-parse", "--show-toplevel"],  # noqa: S607
            cwd=origin,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    return Path(completed.stdout.strip()).resolve()


def find_skill_root() -> Path:
    """Locate the gauntlet-loop skill root from the installed package.

    Works both from the unpacked Agent Skill tree (scripts/gauntlet/ two
    levels below the root) and from an installed wheel (bundled resources
    under ``gauntlet/_bundled``).
    """
    package_dir = Path(__file__).resolve().parent
    tree_root = package_dir.parent.parent
    if (tree_root / "SKILL.md").is_file() and (tree_root / "references").is_dir():
        return tree_root
    bundled = package_dir / "_bundled"
    if (bundled / "SKILL.md").is_file():
        return bundled
    raise InvalidInvocationError(
        "cannot locate the gauntlet-loop skill root",
        hint="reinstall the package or run from the skill source tree",
    )


def skill_resource(relative: str) -> Path:
    """Resolve a bundled skill resource (references/, assets/, SKILL.md)."""
    root = find_skill_root()
    candidate = (root / relative).resolve()
    if not str(candidate).startswith(str(root.resolve()) + os.sep) and candidate != root:
        raise SecurityViolationError(f"resource path escapes the skill root: {relative!r}")
    if not candidate.exists():
        raise InvalidInvocationError(f"skill resource not found: {relative!r}")
    return candidate


def _resources_anchor() -> object:
    return resources.files("gauntlet")


@dataclass(frozen=True)
class ProjectPaths:
    """All well-known locations inside one ``.gauntlet/`` project."""

    git_root: Path

    @property
    def gauntlet_dir(self) -> Path:
        return self.git_root / PROJECT_DIR_NAME

    @property
    def config_file(self) -> Path:
        return self.gauntlet_dir / "config.yaml"

    @property
    def local_config_file(self) -> Path:
        return self.gauntlet_dir / "config.local.yaml"

    @property
    def spec_dir(self) -> Path:
        return self.gauntlet_dir / "spec"

    @property
    def spec_digests_dir(self) -> Path:
        return self.spec_dir / "digests"

    @property
    def policies_dir(self) -> Path:
        return self.gauntlet_dir / "policies"

    @property
    def profiles_dir(self) -> Path:
        return self.gauntlet_dir / "profiles"

    @property
    def schemas_dir(self) -> Path:
        return self.gauntlet_dir / "schemas"

    @property
    def evaluators_dir(self) -> Path:
        return self.gauntlet_dir / "evaluators"

    @property
    def datasets_dir(self) -> Path:
        return self.gauntlet_dir / "datasets"

    @property
    def sealed_promotion_dir(self) -> Path:
        return self.datasets_dir / "promotion" / "sealed"

    @property
    def reference_pack_dir(self) -> Path:
        return self.gauntlet_dir / "reference-pack"

    @property
    def counterexamples_dir(self) -> Path:
        return self.gauntlet_dir / "counterexamples"

    @property
    def handoffs_dir(self) -> Path:
        return self.gauntlet_dir / "handoffs"

    @property
    def ledger_dir(self) -> Path:
        return self.gauntlet_dir / "ledger"

    @property
    def artifacts_dir(self) -> Path:
        return self.gauntlet_dir / "artifacts"

    @property
    def blobs_dir(self) -> Path:
        return self.artifacts_dir / "blobs"

    @property
    def staging_dir(self) -> Path:
        return self.artifacts_dir / "staging"

    @property
    def workspace_manifests_dir(self) -> Path:
        return self.gauntlet_dir / "workspace-manifests"

    @property
    def state_dir(self) -> Path:
        return self.gauntlet_dir / "state"

    @property
    def store_file(self) -> Path:
        return self.state_dir / "activegraph.sqlite3"

    @property
    def traces_dir(self) -> Path:
        return self.gauntlet_dir / "traces"

    @property
    def runs_dir(self) -> Path:
        return self.gauntlet_dir / "runs"

    @property
    def exports_dir(self) -> Path:
        return self.gauntlet_dir / "exports"

    @property
    def cache_dir(self) -> Path:
        return self.gauntlet_dir / "cache"

    @property
    def tmp_dir(self) -> Path:
        return self.gauntlet_dir / "tmp"

    @property
    def locks_dir(self) -> Path:
        return self.gauntlet_dir / "locks"

    @property
    def secrets_dir(self) -> Path:
        return self.gauntlet_dir / "secrets"

    @property
    def workflows_dir(self) -> Path:
        return self.gauntlet_dir / "workflows"

    @property
    def workflow_checkpoints_dir(self) -> Path:
        return self.runs_dir / "workflow-checkpoints"

    def worktree_root(self) -> Path:
        """Default external worktree root: sibling of the repository."""
        return self.git_root.parent / f".{self.git_root.name}.gauntlet-worktrees"

    def resolve_project_path(self, relative: str) -> Path:
        """Resolve a path inside .gauntlet/ and reject escapes."""
        if Path(relative).is_absolute():
            raise SecurityViolationError(f"absolute project paths are rejected: {relative!r}")
        candidate = (self.gauntlet_dir / relative).resolve()
        root = self.gauntlet_dir.resolve()
        if candidate != root and not str(candidate).startswith(str(root) + os.sep):
            raise SecurityViolationError(f"path escapes {PROJECT_DIR_NAME}/: {relative!r}")
        return candidate


def require_project(start: Path | None = None) -> ProjectPaths:
    git_root = find_git_root(start)
    if git_root is None:
        raise InvalidInvocationError(
            "not inside a Git repository",
            hint="run inside a Git repository, or pass --allow-no-git to `gauntlet project init`",
        )
    paths = ProjectPaths(git_root=git_root)
    if not paths.gauntlet_dir.is_dir():
        raise InvalidInvocationError(
            f"no {PROJECT_DIR_NAME}/ project found at {git_root}",
            hint="run `gauntlet project init` first",
        )
    return paths


def atomic_write(path: Path, data: bytes, *, mode: int = 0o644) -> None:
    """Write-then-rename with fsync; never leaves partial files."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        with tmp.open("wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        tmp.chmod(mode)
        tmp.replace(path)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def atomic_write_text(path: Path, text: str, *, mode: int = 0o644) -> None:
    atomic_write(path, text.encode("utf-8"), mode=mode)
