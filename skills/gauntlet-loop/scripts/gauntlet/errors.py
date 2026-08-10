"""Exception hierarchy mapped to the stable exit-code vocabulary.

Every CLI failure path raises a ``GauntletError`` subclass; ``cli.main`` maps
``error.exit_code`` onto the process exit status. Never raise bare exceptions
across a module boundary for an expected failure mode.
"""

from __future__ import annotations

from gauntlet.constants import ExitCode


class GauntletError(Exception):
    """Base class; concrete subclasses pin an exit code."""

    exit_code: int = ExitCode.INVALID

    def __init__(self, message: str, *, hint: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.hint = hint

    def render(self) -> str:
        if self.hint:
            return f"{self.message}\nhint: {self.hint}"
        return self.message


class InvalidInvocationError(GauntletError):
    """Bad arguments, malformed schema/config, or unusable project state."""

    exit_code = ExitCode.INVALID


class ApprovalRequiredError(GauntletError):
    """The action needs an approval or governance decision first."""

    exit_code = ExitCode.APPROVAL_REQUIRED


class GateFailedError(GauntletError):
    """An invariant, evaluator, or promotion gate failed."""

    exit_code = ExitCode.GATE_FAILED


class InconclusiveError(GauntletError):
    """Evidence is insufficient either way; never promoted."""

    exit_code = ExitCode.INCONCLUSIVE


class ConflictError(GauntletError):
    """Concurrency, Git, or graph promotion conflict."""

    exit_code = ExitCode.CONFLICT


class OutcomeUnknownError(GauntletError):
    """External effect outcome is unknown and requires reconciliation."""

    exit_code = ExitCode.OUTCOME_UNKNOWN


class DependencyUnavailableError(GauntletError):
    """A required dependency or optional integration is not installed."""

    exit_code = ExitCode.DEPENDENCY_UNAVAILABLE


class SecurityViolationError(GauntletError):
    """Integrity, provenance, leakage, or security control violation."""

    exit_code = ExitCode.SECURITY_VIOLATION
