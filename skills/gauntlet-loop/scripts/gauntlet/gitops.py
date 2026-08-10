"""Typed Git runner, external worktree manager, and frozen-surface checks.

Safety rules enforced here (see references/command-campaign.md and the
security requirements in the execution brief):

- every Git call is an argv array through the injected ``ProcessRunner``
  with an explicit ``cwd``, a scrubbed environment, and a timeout;
- destructive subcommands (``reset``, ``stash``, ``clean``, ``push``,
  ``filter-branch``) are refused at construction time so unrelated user
  work can never be reset, force-pushed, or silently stashed;
- user-supplied refs are validated before use and refs starting with ``-``
  are rejected (option injection);
- candidate worktrees live *outside* the main worktree under
  ``ProjectPaths.worktree_root()``; the absolute local path is recorded only
  in an ignored ``<id>.local.json`` file while branch/commit/parent and the
  sanitized workspace id go into a tracked ``<id>.json`` manifest;
- a worktree is deleted only after proving it belongs to this project
  (``git worktree list --porcelain`` membership, a local manifest recording
  the exact path, and containment under the worktree root) and only via
  ``git worktree remove`` + ``git worktree prune`` -- never a recursive
  filesystem deletion of an unverified path;
- promotion merges land on a *new* local promotion branch computed with a
  three-way ``git merge-tree`` check first; the user's checked-out branch
  and the target branch are never mutated.

Glob semantics: frozen surfaces and permitted globs use gitignore-style
patterns where ``**`` crosses path-segment boundaries, ``*`` and ``?`` stay
inside one segment, and matching is anchored full-path matching on
POSIX-style relative paths (``PurePosixPath`` form). This is documented here
once and reused by campaigns/experiments; ``fnmatch`` is deliberately not
used because it lets ``*`` cross ``/``.
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Literal

from gauntlet.canonical_json import canonical_bytes
from gauntlet.constants import DEFAULT_FROZEN_SURFACES
from gauntlet.errors import (
    ConflictError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.paths import ProjectPaths, atomic_write, find_skill_root
from gauntlet.support import Clock, CompletedProcess, ProcessRunner, SubprocessRunner, SystemClock

MergeTreeMode = Literal["write-tree", "classic"]

#: git merge-tree --write-tree exists since git 2.38.
_WRITE_TREE_MIN_VERSION = (2, 38)

#: Subcommands gitops refuses to construct at all. Push is a release effect
#: handled elsewhere behind human authority; the rest destroy or hide work.
_FORBIDDEN_SUBCOMMANDS = frozenset({"reset", "stash", "clean", "push", "filter-branch"})

_SKILL_ROOT_PLACEHOLDER = "<skill-root>"

_REF_FORBIDDEN_CHARS = frozenset(" \t\n\r~^:?*[\\")

WORKSPACE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]*$")

TRACKED_MANIFEST_SCHEMA = "dev.gauntlet.workspace-manifest/v1"
LOCAL_MANIFEST_SCHEMA = "dev.gauntlet.workspace-local/v1"


def slugify(value: str) -> str:
    """Deterministic branch/workspace slug: lowercase ``[a-z0-9._-]`` only."""
    slug = re.sub(r"[^a-z0-9._-]+", "-", value.lower()).strip("-.")
    if not slug or slug.startswith("-"):
        raise InvalidInvocationError(f"cannot derive a safe slug from {value!r}")
    return slug


def _git_env() -> dict[str, str]:
    """Scrubbed Git environment: no user/system config, fixed identity."""
    return {
        "PATH": os.environ.get("PATH", ""),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_AUTHOR_NAME": "gauntlet",
        "GIT_AUTHOR_EMAIL": "gauntlet@gauntlet.invalid",
        "GIT_COMMITTER_NAME": "gauntlet",
        "GIT_COMMITTER_EMAIL": "gauntlet@gauntlet.invalid",
        "GIT_TERMINAL_PROMPT": "0",
        "LC_ALL": "C",
    }


# ---------------------------------------------------------------------------
# Glob matching (documented semantics: see module docstring)
# ---------------------------------------------------------------------------


def _glob_to_regex(pattern: str) -> re.Pattern[str]:
    normalized = PurePosixPath(pattern.replace("\\", "/")).as_posix()
    parts: list[str] = []
    i = 0
    while i < len(normalized):
        if normalized.startswith("**/", i):
            parts.append(r"(?:[^/]+/)*")
            i += 3
        elif normalized.startswith("**", i):
            parts.append(r".*")
            i += 2
        elif normalized[i] == "*":
            parts.append(r"[^/]*")
            i += 1
        elif normalized[i] == "?":
            parts.append(r"[^/]")
            i += 1
        else:
            parts.append(re.escape(normalized[i]))
            i += 1
    return re.compile("^" + "".join(parts) + "$")


def glob_match(path: str, pattern: str) -> bool:
    """Anchored gitignore-style match on a POSIX-form relative path."""
    normalized = PurePosixPath(path.replace("\\", "/")).as_posix()
    return _glob_to_regex(pattern).match(normalized) is not None


def _literal_prefix(pattern: str) -> tuple[str, ...]:
    """Path segments before the first wildcard-bearing segment."""
    segments = PurePosixPath(pattern.replace("\\", "/")).as_posix().split("/")
    prefix: list[str] = []
    for segment in segments:
        if any(ch in segment for ch in "*?["):
            break
        prefix.append(segment)
    return tuple(prefix)


def globs_may_intersect(a: str, b: str) -> bool:
    """Conservative glob-vs-glob overlap: literal prefixes nest either way.

    This over-approximates (it may report an intersection that is actually
    empty) but never misses one, which is the safe direction for refusing a
    permitted set that touches a frozen surface.
    """
    prefix_a = _literal_prefix(a)
    prefix_b = _literal_prefix(b)
    shorter, longer = sorted((prefix_a, prefix_b), key=len)
    return longer[: len(shorter)] == shorter


def frozen_permitted_intersection(
    permitted_globs: Iterable[str], frozen_surfaces: Iterable[str]
) -> list[tuple[str, str]]:
    """Every (permitted, frozen) pair that may overlap; empty means safe."""
    frozen = list(frozen_surfaces)
    return [
        (permitted, surface)
        for permitted in permitted_globs
        for surface in frozen
        if globs_may_intersect(permitted, surface)
    ]


def expand_frozen_surfaces(
    surfaces: Iterable[str] | None = None,
    *,
    git_root: Path,
    skill_root: Path | None = None,
) -> tuple[str, ...]:
    """Expand ``<skill-root>`` in frozen-surface globs against the real root.

    When the skill root is not inside the repository, its patterns cannot be
    reached by a repository diff, so they are dropped (the skill files are
    protected by living outside the candidate's reachable tree).
    """
    resolved_skill_root = skill_root if skill_root is not None else find_skill_root()
    expanded: list[str] = []
    for surface in DEFAULT_FROZEN_SURFACES if surfaces is None else surfaces:
        if _SKILL_ROOT_PLACEHOLDER in surface:
            try:
                relative = resolved_skill_root.resolve().relative_to(git_root.resolve())
            except ValueError:
                continue
            prefix = relative.as_posix()
            replacement = "" if prefix == "." else prefix
            substituted = surface.replace(_SKILL_ROOT_PLACEHOLDER + "/", f"{replacement}/")
            substituted = substituted.replace(_SKILL_ROOT_PLACEHOLDER, replacement)
            expanded.append(substituted.lstrip("/"))
        else:
            expanded.append(surface)
    return tuple(expanded)


@dataclass(frozen=True)
class ScopeReport:
    """Result of validating changed paths against permitted/frozen globs."""

    frozen_violations: tuple[str, ...]
    outside_permitted: tuple[str, ...]

    @property
    def ok(self) -> bool:
        return not self.frozen_violations and not self.outside_permitted


def check_change_scope(
    changed_paths: Iterable[str],
    *,
    permitted_globs: Sequence[str],
    frozen_surfaces: Sequence[str],
) -> ScopeReport:
    """Classify changed paths: frozen-surface hits and out-of-scope edits.

    Used before execution (planned surface) and again after execution and
    before promotion (actual diff), per the experiment-controller brief.
    """
    frozen: list[str] = []
    outside: list[str] = []
    for path in sorted(set(changed_paths)):
        if any(glob_match(path, surface) for surface in frozen_surfaces):
            frozen.append(path)
        if permitted_globs and not any(glob_match(path, glob) for glob in permitted_globs):
            outside.append(path)
    return ScopeReport(frozen_violations=tuple(frozen), outside_permitted=tuple(outside))


# ---------------------------------------------------------------------------
# Git runner
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MergeCheck:
    """Three-way applicability result; computed without touching any ref."""

    applicable: bool
    conflicts: tuple[str, ...]
    mode: MergeTreeMode
    merged_tree: str | None


@dataclass(frozen=True)
class PromotionOutcome:
    branch: str
    commit: str
    mode: MergeTreeMode


class GitRunner:
    """argv-array Git execution bound to one repository root."""

    def __init__(
        self,
        repo_root: Path,
        runner: ProcessRunner | None = None,
        *,
        timeout_seconds: int = 120,
        merge_tree_mode: Literal["auto", "write-tree", "classic"] = "auto",
    ) -> None:
        self._root = repo_root.resolve()
        self._runner: ProcessRunner = runner if runner is not None else SubprocessRunner()
        self._timeout = timeout_seconds
        self._configured_mode = merge_tree_mode
        self._resolved_mode: MergeTreeMode | None = None
        self._version: tuple[int, int, int] | None = None

    @property
    def repo_root(self) -> Path:
        return self._root

    def run(
        self,
        args: Sequence[str],
        *,
        cwd: Path | None = None,
        check: bool = True,
    ) -> CompletedProcess:
        if not args:
            raise InvalidInvocationError("empty git argument list")
        if args[0] in _FORBIDDEN_SUBCOMMANDS:
            raise SecurityViolationError(
                f"git subcommand {args[0]!r} is forbidden by gitops policy",
                hint="gauntlet never resets, stashes, cleans, pushes, or rewrites user work",
            )
        completed = self._runner.run(
            ["git", *args],
            cwd=cwd if cwd is not None else self._root,
            env=_git_env(),
            timeout_seconds=self._timeout,
        )
        if completed.timed_out:
            raise ConflictError(f"git {args[0]} timed out after {self._timeout}s")
        if check and completed.exit_code != 0:
            raise InvalidInvocationError(
                f"git {' '.join(args)} failed (exit {completed.exit_code}): "
                f"{completed.stderr.strip()}"
            )
        return completed

    # -- introspection ------------------------------------------------------

    def git_version(self) -> tuple[int, int, int]:
        if self._version is None:
            output = self.run(["version"]).stdout.strip()
            match = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", output)
            if match is None:
                raise InvalidInvocationError(f"cannot parse git version from {output!r}")
            self._version = (
                int(match.group(1)),
                int(match.group(2)),
                int(match.group(3) or 0),
            )
        return self._version

    def merge_tree_mode(self) -> MergeTreeMode:
        """Resolve (once) which merge-tree strategy this git supports."""
        if self._resolved_mode is None:
            if self._configured_mode != "auto":
                self._resolved_mode = self._configured_mode
            elif self.git_version()[:2] >= _WRITE_TREE_MIN_VERSION:
                self._resolved_mode = "write-tree"
            else:
                self._resolved_mode = "classic"
        return self._resolved_mode

    def current_commit(self, ref: str = "HEAD") -> str:
        return self.validate_ref(ref)

    def current_branch(self, *, cwd: Path | None = None) -> str:
        return self.run(["rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd).stdout.strip()

    def is_dirty(self, *, cwd: Path | None = None) -> bool:
        return bool(self.dirty_paths(cwd=cwd))

    def dirty_paths(self, *, cwd: Path | None = None) -> list[str]:
        """Modified/added/deleted/untracked paths relative to the worktree."""
        output = self.run(["status", "--porcelain", "--untracked-files=all"], cwd=cwd).stdout
        paths: list[str] = []
        for line in output.splitlines():
            if not line.strip():
                continue
            entry = line[3:]
            if " -> " in entry:
                entry = entry.split(" -> ", 1)[1]
            paths.append(entry.strip().strip('"'))
        return paths

    # -- ref safety ---------------------------------------------------------

    @staticmethod
    def _reject_unsafe_ref_text(ref: str) -> None:
        if not ref:
            raise SecurityViolationError("empty ref rejected")
        if ref.startswith("-"):
            raise SecurityViolationError(
                f"ref {ref!r} starts with '-' and is rejected (option injection)"
            )
        if ".." in ref or ref.endswith("/") or "@{" in ref:
            raise SecurityViolationError(f"ref {ref!r} contains a rejected sequence")
        if any(ch in _REF_FORBIDDEN_CHARS for ch in ref) or any(ord(ch) < 0x20 for ch in ref):
            raise SecurityViolationError(f"ref {ref!r} contains forbidden characters")

    def validate_ref(self, ref: str) -> str:
        """Validate a user-supplied ref and return the full commit id."""
        self._reject_unsafe_ref_text(ref)
        completed = self.run(["rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"], check=False)
        if completed.exit_code != 0:
            raise InvalidInvocationError(f"unknown or non-commit ref: {ref!r}")
        return completed.stdout.strip()

    def validate_branch_name(self, name: str) -> str:
        self._reject_unsafe_ref_text(name)
        return name

    def branch_exists(self, name: str) -> bool:
        self._reject_unsafe_ref_text(name)
        completed = self.run(
            ["rev-parse", "--verify", "--quiet", f"refs/heads/{name}"], check=False
        )
        return completed.exit_code == 0

    def create_branch(self, name: str, from_commit: str) -> str:
        """Create a new local branch; never moves an existing one."""
        self.validate_branch_name(name)
        commit = self.validate_ref(from_commit)
        if self.branch_exists(name):
            raise ConflictError(f"branch already exists: {name!r}")
        self.run(["branch", "--", name, commit])
        return commit

    def list_branches(self, prefix: str = "") -> list[str]:
        prefix = prefix.rstrip("/")
        if prefix:
            self._reject_unsafe_ref_text(prefix)
        completed = self.run(["for-each-ref", "--format=%(refname:short)", f"refs/heads/{prefix}"])
        return [line.strip() for line in completed.stdout.splitlines() if line.strip()]

    def diff_name_only(self, a: str, b: str) -> list[str]:
        commit_a = self.validate_ref(a)
        commit_b = self.validate_ref(b)
        output = self.run(["diff", "--name-only", commit_a, commit_b]).stdout
        return [line.strip() for line in output.splitlines() if line.strip()]

    # -- worktrees ----------------------------------------------------------

    def worktree_add(self, path: Path, branch: str) -> None:
        self.validate_branch_name(branch)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.run(["worktree", "add", "--", str(path), branch])

    def worktree_remove(self, path: Path, *, force: bool = False) -> None:
        args = ["worktree", "remove"]
        if force:
            args.append("--force")
        args.extend(["--", str(path)])
        self.run(args)

    def worktree_prune(self) -> None:
        self.run(["worktree", "prune"])

    def worktree_paths(self) -> list[Path]:
        output = self.run(["worktree", "list", "--porcelain"]).stdout
        paths: list[Path] = []
        for line in output.splitlines():
            if line.startswith("worktree "):
                paths.append(Path(line[len("worktree ") :]).resolve())
        return paths

    # -- three-way merge analysis and promotion ------------------------------

    def merge_check(self, target_ref: str, candidate_ref: str) -> MergeCheck:
        """Three-way applicability check without mutating any ref.

        Uses ``git merge-tree --write-tree`` (git >= 2.38) when available and
        falls back to classic ``git merge-tree`` conflict-marker parsing on
        older installations. The mode actually used is recorded in the result.
        """
        target = self.validate_ref(target_ref)
        candidate = self.validate_ref(candidate_ref)
        mode = self.merge_tree_mode()
        if mode == "write-tree":
            return self._merge_check_write_tree(target, candidate)
        return self._merge_check_classic(target, candidate)

    def _merge_check_write_tree(self, target: str, candidate: str) -> MergeCheck:
        completed = self.run(
            ["merge-tree", "--write-tree", "--name-only", target, candidate], check=False
        )
        lines = completed.stdout.splitlines()
        tree = lines[0].strip() if lines else None
        if completed.exit_code == 0:
            return MergeCheck(applicable=True, conflicts=(), mode="write-tree", merged_tree=tree)
        if completed.exit_code == 1:
            conflicts: list[str] = []
            for line in lines[1:]:
                if not line.strip():
                    break
                conflicts.append(line.strip())
            return MergeCheck(
                applicable=False,
                conflicts=tuple(sorted(set(conflicts))),
                mode="write-tree",
                merged_tree=tree,
            )
        raise InvalidInvocationError(
            f"git merge-tree --write-tree failed (exit {completed.exit_code}): "
            f"{completed.stderr.strip()}"
        )

    def _merge_check_classic(self, target: str, candidate: str) -> MergeCheck:
        base = self.run(["merge-base", target, candidate]).stdout.strip()
        completed = self.run(["merge-tree", base, target, candidate])
        conflicts: list[str] = []
        current_file: str | None = None
        in_both = False
        for line in completed.stdout.splitlines():
            if line in {"changed in both", "added in both"}:
                in_both = True
                current_file = None
                continue
            if line and not line[0].isspace() and not line.startswith(("@@", "+", "-", " ")):
                in_both = False
                current_file = None
                continue
            match = re.match(r"^\s+(?:our|result)\s+\d{6} [0-9a-f]{40} (.+)$", line)
            if in_both and match is not None:
                current_file = match.group(1)
                continue
            if in_both and current_file is not None and line.startswith("+<<<<<<<"):
                conflicts.append(current_file)
        return MergeCheck(
            applicable=not conflicts,
            conflicts=tuple(sorted(set(conflicts))),
            mode="classic",
            merged_tree=None,
        )

    def promote_to_new_branch(
        self,
        *,
        candidate_ref: str,
        target_branch: str,
        promotion_branch: str,
        message: str,
    ) -> PromotionOutcome:
        """Merge the candidate onto a NEW local promotion branch.

        The target branch and the user's checked-out branch are never
        mutated: the merge commit is built with ``commit-tree`` from the
        ``merge-tree --write-tree`` result (or in a throwaway worktree on
        classic git) and only the fresh promotion branch points at it.
        A conflict raises ``ConflictError`` before any ref is created.
        """
        self.validate_branch_name(promotion_branch)
        if self.branch_exists(promotion_branch):
            raise ConflictError(f"promotion branch already exists: {promotion_branch!r}")
        if not self.branch_exists(target_branch):
            raise InvalidInvocationError(f"target branch does not exist: {target_branch!r}")
        target_commit = self.validate_ref(target_branch)
        candidate_commit = self.validate_ref(candidate_ref)
        check = self.merge_check(target_branch, candidate_ref)
        if not check.applicable:
            raise ConflictError(
                "candidate does not apply cleanly onto the target branch; "
                f"conflicts: {', '.join(check.conflicts) or 'unknown'}",
                hint="resolve on the candidate branch and re-run promotion planning",
            )
        if check.mode == "write-tree" and check.merged_tree is not None:
            commit = self.run(
                [
                    "commit-tree",
                    check.merged_tree,
                    "-p",
                    target_commit,
                    "-p",
                    candidate_commit,
                    "-m",
                    message,
                ]
            ).stdout.strip()
            self.run(["branch", "--", promotion_branch, commit])
            return PromotionOutcome(branch=promotion_branch, commit=commit, mode="write-tree")
        return self._promote_classic(
            candidate_commit=candidate_commit,
            target_commit=target_commit,
            promotion_branch=promotion_branch,
            message=message,
        )

    def _promote_classic(
        self,
        *,
        candidate_commit: str,
        target_commit: str,
        promotion_branch: str,
        message: str,
    ) -> PromotionOutcome:
        """Classic-git fallback: merge inside a throwaway external worktree."""
        self.run(["branch", "--", promotion_branch, target_commit])
        scratch = (
            self._root.parent / f".{self._root.name}.gauntlet-promote" / slugify(promotion_branch)
        )
        self.worktree_add(scratch, promotion_branch)
        try:
            merged = self.run(
                ["merge", "--no-ff", "--no-edit", "-m", message, candidate_commit],
                cwd=scratch,
                check=False,
            )
            if merged.exit_code != 0:
                self.run(["merge", "--abort"], cwd=scratch, check=False)
                raise ConflictError(f"classic merge failed unexpectedly: {merged.stderr.strip()}")
            commit = self.run(["rev-parse", "HEAD"], cwd=scratch).stdout.strip()
        finally:
            self.worktree_remove(scratch, force=True)
            self.worktree_prune()
        return PromotionOutcome(branch=promotion_branch, commit=commit, mode="classic")


# ---------------------------------------------------------------------------
# Worktree manager
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class WorktreeRecord:
    workspace_id: str
    path: Path
    branch: str
    commit: str
    parent_commit: str
    tracked_manifest: Path
    local_manifest: Path


class WorktreeManager:
    """External candidate worktrees with tracked + local manifests."""

    def __init__(
        self,
        paths: ProjectPaths,
        git: GitRunner,
        *,
        clock: Clock | None = None,
    ) -> None:
        self._paths = paths
        self._git = git
        self._clock: Clock = clock if clock is not None else SystemClock()

    def _manifest_paths(self, workspace_id: str) -> tuple[Path, Path]:
        directory = self._paths.workspace_manifests_dir
        return directory / f"{workspace_id}.json", directory / f"{workspace_id}.local.json"

    def _ensure_local_manifests_ignored(self) -> None:
        gitignore = self._paths.workspace_manifests_dir / ".gitignore"
        if not gitignore.exists():
            atomic_write(gitignore, b"*.local.json\n")

    def sanitize_workspace_id(self, value: str) -> str:
        workspace_id = slugify(value)
        if not WORKSPACE_ID_PATTERN.match(workspace_id):
            raise InvalidInvocationError(f"unsafe workspace id: {value!r}")
        return workspace_id

    def create(
        self,
        workspace_id: str,
        *,
        branch: str,
        parent_commit: str,
        experiment_id: str | None = None,
        permitted_globs: Sequence[str] = (),
        isolate: bool = True,
    ) -> WorktreeRecord:
        """Create a clean external candidate worktree for ``branch``.

        The worktree always lives under ``ProjectPaths.worktree_root()``,
        outside the main worktree, so dirty unrelated work in the main
        worktree cannot leak into the candidate. When the main worktree is
        dirty on paths overlapping ``permitted_globs`` the fork is refused
        unless ``isolate`` is true (the default), i.e. unless this clean
        external worktree is accepted as the isolation mechanism.
        """
        workspace_id = self.sanitize_workspace_id(workspace_id)
        parent = self._git.validate_ref(parent_commit)
        overlap = [
            path
            for path in self._git.dirty_paths()
            if any(glob_match(path, glob) for glob in permitted_globs)
        ]
        if overlap and not isolate:
            raise ConflictError(
                "main worktree is dirty on paths overlapping the experiment surface: "
                + ", ".join(sorted(overlap)),
                hint="commit or isolate with a clean external worktree before forking",
            )
        target = self._paths.worktree_root() / workspace_id
        if target.resolve().is_relative_to(self._paths.git_root.resolve()):
            raise SecurityViolationError(
                f"candidate worktree path is inside the main worktree: {target}"
            )
        if target.exists():
            raise ConflictError(f"worktree path already exists: {target}")
        self._git.worktree_add(target, branch)
        commit = self._git.validate_ref(branch)
        created_at = self._clock.now()
        tracked_path, local_path = self._manifest_paths(workspace_id)
        tracked = {
            "schema_version": TRACKED_MANIFEST_SCHEMA,
            "workspace_id": workspace_id,
            "branch": branch,
            "commit": commit,
            "parent_commit": parent,
            "experiment_id": experiment_id,
            "created_at": created_at,
        }
        local = {
            "schema_version": LOCAL_MANIFEST_SCHEMA,
            "workspace_id": workspace_id,
            "path": str(target.resolve()),
            "isolated_dirty_overlap": sorted(overlap),
            "created_at": created_at,
        }
        atomic_write(tracked_path, canonical_bytes(tracked))
        atomic_write(local_path, canonical_bytes(local))
        self._ensure_local_manifests_ignored()
        return WorktreeRecord(
            workspace_id=workspace_id,
            path=target,
            branch=branch,
            commit=commit,
            parent_commit=parent,
            tracked_manifest=tracked_path,
            local_manifest=local_path,
        )

    def local_path(self, workspace_id: str) -> Path:
        _, local_manifest = self._manifest_paths(self.sanitize_workspace_id(workspace_id))
        if not local_manifest.is_file():
            raise InvalidInvocationError(
                f"no local workspace manifest for {workspace_id!r}",
                hint="the worktree was removed or was created on another machine",
            )
        payload = json.loads(local_manifest.read_text(encoding="utf-8"))
        return Path(str(payload["path"]))

    def _verify_owned(self, path: Path) -> None:
        """Prove ``path`` is a Gauntlet-owned worktree of this project."""
        resolved = path.resolve()
        root = self._paths.worktree_root().resolve()
        if not resolved.is_relative_to(root):
            raise SecurityViolationError(
                f"refusing to remove {path}: not under the gauntlet worktree root {root}"
            )
        if resolved not in self._git.worktree_paths():
            raise SecurityViolationError(
                f"refusing to remove {path}: not a registered worktree of this repository"
            )
        for local_manifest in self._paths.workspace_manifests_dir.glob("*.local.json"):
            payload = json.loads(local_manifest.read_text(encoding="utf-8"))
            if Path(str(payload["path"])).resolve() == resolved:
                return
        raise SecurityViolationError(
            f"refusing to remove {path}: no gauntlet workspace manifest records it"
        )

    def remove_worktree_path(self, path: Path, *, force: bool = False) -> None:
        """Remove a verified owned worktree via git; never a recursive delete."""
        self._verify_owned(path)
        self._git.worktree_remove(path, force=force)
        self._git.worktree_prune()

    def remove(self, workspace_id: str, *, force: bool = False) -> None:
        workspace_id = self.sanitize_workspace_id(workspace_id)
        path = self.local_path(workspace_id)
        self.remove_worktree_path(path, force=force)
        _, local_manifest = self._manifest_paths(workspace_id)
        local_manifest.unlink(missing_ok=True)
