"""Thin ORAS CLI adapter: argv builders plus an authority-gated runner.

Commands are always argv arrays executed through the injected
``ProcessRunner`` -- there is no shell, so metacharacters in references or
paths are never interpreted. References are additionally validated to reject
whitespace and leading dashes (option injection). ``dry_run`` returns the
exact argv without executing anything, and every real execution requires the
injected authority gate to approve the ``push``/``pull`` capability first.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from gauntlet.errors import (
    ApprovalRequiredError,
    DependencyUnavailableError,
    InvalidInvocationError,
)
from gauntlet.support import CompletedProcess, ProcessRunner

_INSTALL_HINT = "install oras from https://oras.land and ensure `oras` is on PATH"

# OCI reference: registry/repo[:tag][@digest]; conservative charset, no
# whitespace, no shell-significant characters beyond what OCI requires.
_REFERENCE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._/:@+-]*$", re.IGNORECASE)


class AuthorityGate(Protocol):
    """Injected effect-authorization seam; adapters never self-authorize."""

    def authorize_effect(self, capability: str) -> bool: ...


def _validate_reference(reference: str) -> str:
    if not reference or reference.startswith("-") or not _REFERENCE_PATTERN.match(reference):
        raise InvalidInvocationError(
            f"unsafe or malformed OCI reference: {reference!r}",
            hint="references must be plain registry/repo[:tag][@digest] strings",
        )
    return reference


def build_push_argv(
    reference: str,
    *,
    artifact_type: str,
    files: list[tuple[str, str]],
) -> list[str]:
    """Build ``oras push`` argv; ``files`` is (relative path, media type)."""
    _validate_reference(reference)
    if not files:
        raise InvalidInvocationError("oras push requires at least one file entry")
    argv = ["oras", "push", "--artifact-type", artifact_type, reference]
    for relative_path, media_type in files:
        if relative_path.startswith(("-", "/")) or ".." in relative_path.split("/"):
            raise InvalidInvocationError(
                f"unsafe bundle-relative path for oras push: {relative_path!r}"
            )
        argv.append(f"{relative_path}:{media_type}")
    return argv


def build_pull_argv(reference: str, *, output_dir: Path) -> list[str]:
    _validate_reference(reference)
    return ["oras", "pull", "--output", str(output_dir), reference]


@dataclass(frozen=True)
class OrasResult:
    argv: tuple[str, ...]
    executed: bool
    exit_code: int | None = None
    stdout: str = ""
    stderr: str = ""


class OrasClient:
    """Push/pull runner; dry-runnable and gated by the injected authority."""

    def __init__(
        self,
        runner: ProcessRunner,
        authority: AuthorityGate,
        *,
        dry_run: bool = False,
    ) -> None:
        self._runner = runner
        self._authority = authority
        self._dry_run = dry_run

    def _execute(self, argv: list[str], *, capability: str, cwd: Path | None) -> OrasResult:
        if self._dry_run:
            return OrasResult(argv=tuple(argv), executed=False)
        if not self._authority.authorize_effect(capability):
            raise ApprovalRequiredError(
                f"the {capability!r} capability requires an approved intent",
                hint="commit an intent through the authority service first",
            )
        try:
            completed: CompletedProcess = self._runner.run(argv, cwd=cwd)
        except InvalidInvocationError as error:
            raise DependencyUnavailableError(
                "the oras CLI is not available", hint=_INSTALL_HINT
            ) from error
        return OrasResult(
            argv=tuple(argv),
            executed=True,
            exit_code=completed.exit_code,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )

    def push(
        self,
        reference: str,
        *,
        artifact_type: str,
        files: list[tuple[str, str]],
        cwd: Path,
    ) -> OrasResult:
        argv = build_push_argv(reference, artifact_type=artifact_type, files=files)
        return self._execute(argv, capability="push", cwd=cwd)

    def pull(self, reference: str, *, output_dir: Path) -> OrasResult:
        argv = build_pull_argv(reference, output_dir=output_dir)
        return self._execute(argv, capability="pull", cwd=None)
