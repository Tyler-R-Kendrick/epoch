"""Cross-platform project mutation lock built on filelock."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from filelock import FileLock, Timeout

from gauntlet.errors import ConflictError


@contextmanager
def project_lock(locks_dir: Path, *, timeout_seconds: int = 30) -> Iterator[None]:
    """Acquire the single project mutation lock or fail with exit code 6."""
    locks_dir.mkdir(parents=True, exist_ok=True)
    lock = FileLock(str(locks_dir / "project.lock"))
    try:
        with lock.acquire(timeout=timeout_seconds):
            yield
    except Timeout as error:
        raise ConflictError(
            f"could not acquire the project lock within {timeout_seconds}s",
            hint="another gauntlet command is mutating this project; retry after it finishes",
        ) from error
