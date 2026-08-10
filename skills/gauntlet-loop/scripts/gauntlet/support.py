"""Injected clock, ID generation, and process-running seams.

Every service takes these via constructor injection so tests are fully
deterministic (frozen clock, sequential IDs, fake process runner).
"""

from __future__ import annotations

import os
import secrets
import subprocess  # noqa: S404 - argv-array execution only, never shell=True
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from gauntlet.errors import InvalidInvocationError


class Clock(Protocol):
    def now(self) -> str:
        """RFC 3339 UTC timestamp."""
        ...


class SystemClock:
    def now(self) -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


@dataclass
class FrozenClock:
    """Deterministic clock for tests; ticks one millisecond per call."""

    current: str = "2026-01-01T00:00:00.000Z"
    _tick: int = 0

    def now(self) -> str:
        stamp = datetime.strptime(self.current, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=UTC)
        value = stamp.timestamp() + self._tick / 1000.0
        self._tick += 1
        return datetime.fromtimestamp(value, UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class IdGenerator(Protocol):
    def new_id(self, prefix: str) -> str:
        """Return ``<prefix>:<opaque-stable-token>``."""
        ...


class RandomIdGenerator:
    def new_id(self, prefix: str) -> str:
        return f"{prefix}:{secrets.token_hex(8)}"


@dataclass
class SequentialIdGenerator:
    """Deterministic IDs for tests: ``prefix:000001`` and so on."""

    counters: dict[str, int] = field(default_factory=dict)

    def new_id(self, prefix: str) -> str:
        value = self.counters.get(prefix, 0) + 1
        self.counters[prefix] = value
        return f"{prefix}:{value:06d}"


@dataclass(frozen=True)
class CompletedProcess:
    argv: tuple[str, ...]
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False


class ProcessRunner(Protocol):
    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess: ...


class SubprocessRunner:
    """argv-array execution with scrubbed environment; never shell=True."""

    def run(
        self,
        argv: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 300,
        max_output_bytes: int = 10_485_760,
    ) -> CompletedProcess:
        if not argv:
            raise InvalidInvocationError("empty command argv")
        run_env = {"PATH": os.environ.get("PATH", "")}
        if env:
            run_env.update(env)
        try:
            completed = subprocess.run(  # noqa: S603
                argv,
                cwd=cwd,
                env=run_env,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
        except FileNotFoundError as error:
            raise InvalidInvocationError(f"executable not found: {argv[0]!r}") from error
        except subprocess.TimeoutExpired as expired:

            def _as_text(raw: str | bytes | None) -> str:
                if raw is None:
                    return ""
                if isinstance(raw, bytes):
                    return raw.decode("utf-8", "replace")
                return raw

            return CompletedProcess(
                argv=tuple(argv),
                exit_code=-1,
                stdout=_as_text(expired.stdout)[:max_output_bytes],
                stderr=_as_text(expired.stderr)[:max_output_bytes],
                timed_out=True,
            )
        return CompletedProcess(
            argv=tuple(argv),
            exit_code=completed.returncode,
            stdout=completed.stdout[:max_output_bytes],
            stderr=completed.stderr[:max_output_bytes],
        )
