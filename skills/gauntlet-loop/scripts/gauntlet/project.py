"""Project lifecycle: init, doctor, status, migrate.

``gauntlet project init`` materializes ``.gauntlet/`` from the bundled
template. Initialization is atomic, idempotent, never overwrites a
non-identical existing file, and never touches the repository root
``.gitignore`` unless explicitly asked.
"""

from __future__ import annotations

import json
import shutil
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

import gauntlet
from gauntlet.canonical_json import digest_bytes
from gauntlet.errors import (
    ConflictError,
    DependencyUnavailableError,
    InvalidInvocationError,
)
from gauntlet.models import ProjectConfigV1
from gauntlet.paths import ProjectPaths, atomic_write, find_git_root, skill_resource
from gauntlet.schemas import check_drift, generate_all
from gauntlet.support import Clock, ProcessRunner, SubprocessRunner, SystemClock

_TEMPLATE_RELATIVE = "assets/project-template/.gauntlet"


@dataclass
class InitReport:
    created: list[str] = field(default_factory=list)
    skipped_identical: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    project_id: str | None = None
    next_action: str = ""

    def to_json(self) -> dict[str, Any]:
        return {
            "created": self.created,
            "skipped_identical": self.skipped_identical,
            "conflicts": self.conflicts,
            "project_id": self.project_id,
            "next_action": self.next_action,
        }


def _render_template(text: str, project_id: str) -> str:
    return text.replace("${GENERATED_PROJECT_UUID}", project_id).replace(
        "${SKILL_VERSION}", gauntlet.__version__
    )


def init_project(
    *,
    start: Path | None = None,
    allow_no_git: bool = False,
    update_root_gitignore: bool = False,
    clock: Clock | None = None,
    project_id: str | None = None,
) -> InitReport:
    """Create .gauntlet/ from the bundled template without overwriting."""
    clock = clock or SystemClock()
    git_root = find_git_root(start)
    if git_root is None:
        if not allow_no_git:
            raise InvalidInvocationError(
                "not inside a Git repository",
                hint="pass --allow-no-git to initialize anyway (worktree features disabled)",
            )
        git_root = (start or Path.cwd()).resolve()
    paths = ProjectPaths(git_root=git_root)
    template_root = skill_resource(_TEMPLATE_RELATIVE)

    report = InitReport()
    existing_config = paths.config_file
    if existing_config.is_file():
        config = ProjectConfigV1.model_validate(
            yaml.safe_load(existing_config.read_text(encoding="utf-8"))
        )
        generated_id = config.project_id
    else:
        generated_id = project_id or f"gauntlet-{uuid.uuid4()}"
    report.project_id = generated_id

    for source in sorted(template_root.rglob("*")):
        relative = source.relative_to(template_root)
        target = paths.gauntlet_dir / relative
        if source.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        if source.name == ".gitkeep":
            target.parent.mkdir(parents=True, exist_ok=True)
            directory_empty = not any(p for p in target.parent.iterdir() if p.name != ".gitkeep")
            if directory_empty and not target.exists():
                atomic_write(target, b"")
                report.created.append(str(relative))
            continue
        rendered = _render_template(source.read_text(encoding="utf-8"), generated_id).encode(
            "utf-8"
        )
        if target.exists():
            if digest_bytes(target.read_bytes()) == digest_bytes(rendered):
                report.skipped_identical.append(str(relative))
            else:
                # Existing user file differs: keep it; migration is explicit.
                report.conflicts.append(str(relative))
            continue
        atomic_write(target, rendered)
        report.created.append(str(relative))

    schema_manifest = generate_all(paths.schemas_dir)
    manifest_doc = {
        "schema_version": "dev.gauntlet.schema-manifest/v1",
        "copied_by": "gauntlet project init",
        "skill_version": gauntlet.__version__,
        "schemas": schema_manifest,
    }
    atomic_write(
        paths.schemas_dir / "manifest.yaml",
        yaml.safe_dump(manifest_doc, sort_keys=True).encode("utf-8"),
    )

    worktree_root = paths.worktree_root()
    worktree_root.mkdir(parents=True, exist_ok=True)

    init_record = {
        "schema_version": "dev.gauntlet.init-record/v1",
        "project_id": generated_id,
        "skill_version": gauntlet.__version__,
        "activegraph_version": _installed_version("activegraph"),
        "initialized_at": clock.now(),
        "worktree_root": str(worktree_root),
    }
    record_path = paths.state_dir / "init-record.json"
    if not record_path.exists():
        atomic_write(record_path, json.dumps(init_record, indent=2, sort_keys=True).encode())
        report.created.append("state/init-record.json")

    if update_root_gitignore:
        _append_root_gitignore(git_root)

    report.next_action = (
        "run `gauntlet project doctor` to verify the environment, then "
        "`gauntlet spec init` to draft your first campaign spec"
    )
    return report


def _append_root_gitignore(git_root: Path) -> None:
    marker = "# gauntlet-loop worktree metadata"
    gitignore = git_root / ".gitignore"
    existing = gitignore.read_text(encoding="utf-8") if gitignore.is_file() else ""
    if marker in existing:
        return
    addition = f"\n{marker}\n.gauntlet/workspace-manifests/*.local.json\n"
    atomic_write(gitignore, (existing + addition).encode("utf-8"))


def _installed_version(distribution: str) -> str | None:
    try:
        from importlib.metadata import version

        return version(distribution)
    except Exception:  # noqa: BLE001 - version discovery is best-effort
        return None


@dataclass
class DoctorCheck:
    name: str
    passed: bool
    detail: str


def doctor(
    *,
    start: Path | None = None,
    runner: ProcessRunner | None = None,
) -> list[DoctorCheck]:
    """Diagnose the environment and project without mutating anything."""
    runner = runner or SubprocessRunner()
    checks: list[DoctorCheck] = []

    git_root = find_git_root(start)
    checks.append(
        DoctorCheck(
            "git-repository",
            git_root is not None,
            str(git_root) if git_root else "not inside a Git repository",
        )
    )
    checks.append(
        DoctorCheck(
            "python-version",
            sys.version_info >= (3, 11),
            f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        )
    )
    for tool, required in (("git", True), ("uv", False)):
        found = shutil.which(tool) is not None
        checks.append(
            DoctorCheck(
                f"tool-{tool}",
                found or not required,
                "installed" if found else "not found on PATH",
            )
        )
    activegraph_version = _installed_version("activegraph")
    checks.append(
        DoctorCheck(
            "activegraph",
            activegraph_version is not None,
            activegraph_version or "not installed",
        )
    )

    if git_root is not None:
        paths = ProjectPaths(git_root=git_root)
        initialized = paths.gauntlet_dir.is_dir()
        checks.append(
            DoctorCheck(
                "project-initialized",
                initialized,
                str(paths.gauntlet_dir) if initialized else "run `gauntlet project init`",
            )
        )
        if initialized:
            drift = check_drift(paths.schemas_dir)
            checks.append(
                DoctorCheck(
                    "schema-compatibility",
                    not drift,
                    "schemas match installed skill" if not drift else "; ".join(drift[:5]),
                )
            )
            gitignore_ok = (paths.gauntlet_dir / ".gitignore").is_file()
            checks.append(
                DoctorCheck(
                    "scoped-gitignore",
                    gitignore_ok,
                    ".gauntlet/.gitignore present" if gitignore_ok else "missing",
                )
            )
            worktree_root = paths.worktree_root()
            outside = not str(worktree_root.resolve()).startswith(str(git_root.resolve()))
            checks.append(
                DoctorCheck(
                    "worktree-root-outside-repo",
                    outside,
                    str(worktree_root),
                )
            )
            writable = _writable(paths.gauntlet_dir)
            checks.append(
                DoctorCheck(
                    "filesystem-permissions",
                    writable,
                    "writable" if writable else f"{paths.gauntlet_dir} is not writable",
                )
            )
    for cli in ("langsmith", "oras", "cosign"):
        found = shutil.which(cli) is not None
        checks.append(
            DoctorCheck(
                f"optional-{cli}",
                True,
                "installed" if found else "not installed (optional)",
            )
        )
    return checks


def _writable(directory: Path) -> bool:
    probe = directory / ".gauntlet-doctor-probe"
    try:
        probe.write_text("probe", encoding="utf-8")
        probe.unlink()
    except OSError:
        return False
    return True


def project_status(*, start: Path | None = None) -> dict[str, Any]:
    """Read-only project/campaign state summary."""
    git_root = find_git_root(start)
    if git_root is None:
        raise InvalidInvocationError("not inside a Git repository")
    paths = ProjectPaths(git_root=git_root)
    if not paths.gauntlet_dir.is_dir():
        return {"initialized": False, "next_action": "run `gauntlet project init`"}
    config: dict[str, Any] | None = None
    if paths.config_file.is_file():
        config = yaml.safe_load(paths.config_file.read_text(encoding="utf-8"))
    campaigns_dir = paths.ledger_dir / "campaigns"
    campaign_files = sorted(campaigns_dir.glob("*.json")) if campaigns_dir.is_dir() else []
    return {
        "initialized": True,
        "git_root": str(git_root),
        "project_id": (config or {}).get("project_id"),
        "skill_version": gauntlet.__version__,
        "campaign_records": [p.stem for p in campaign_files],
        "store_exists": paths.store_file.is_file(),
    }


def migrate(
    *,
    start: Path | None = None,
    apply: bool = False,
    clock: Clock | None = None,
) -> dict[str, Any]:
    """Explicit, recoverable migration between skill/schema versions."""
    clock = clock or SystemClock()
    git_root = find_git_root(start)
    if git_root is None:
        raise InvalidInvocationError("not inside a Git repository")
    paths = ProjectPaths(git_root=git_root)
    if not paths.gauntlet_dir.is_dir():
        raise InvalidInvocationError("no .gauntlet/ project to migrate")

    drift = check_drift(paths.schemas_dir)
    version_file = paths.gauntlet_dir / "VERSION"
    recorded = version_file.read_text(encoding="utf-8").strip() if version_file.is_file() else None
    pending = bool(drift) or recorded != gauntlet.__version__
    report: dict[str, Any] = {
        "pending": pending,
        "recorded_version": recorded,
        "installed_version": gauntlet.__version__,
        "schema_drift": drift,
        "applied": False,
    }
    if not apply or not pending:
        return report

    backup_dir = paths.gauntlet_dir / "state" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    if paths.store_file.is_file():
        stamp = clock.now().replace(":", "-")
        backup = backup_dir / f"activegraph-{stamp}.sqlite3"
        if backup.exists():
            raise ConflictError(f"backup target already exists: {backup}")
        shutil.copy2(paths.store_file, backup)
        report["backup"] = str(backup)

    # Preserve old schemas, then write the new set alongside a new manifest.
    old_schema_dir = paths.schemas_dir / f"archived-{(recorded or 'unknown')}"
    if not old_schema_dir.exists():
        old_schema_dir.mkdir(parents=True, exist_ok=True)
        for schema_file in paths.schemas_dir.glob("*.schema.json"):
            shutil.copy2(schema_file, old_schema_dir / schema_file.name)
    generate_all(paths.schemas_dir)
    atomic_write(version_file, f"{gauntlet.__version__}\n".encode())
    report["applied"] = True
    return report


def require_uv() -> None:
    if shutil.which("uv") is None:
        raise DependencyUnavailableError(
            "uv is required for locked execution",
            hint="install uv from https://docs.astral.sh/uv/",
        )
