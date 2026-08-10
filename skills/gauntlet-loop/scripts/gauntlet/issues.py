"""Deterministic issue clustering (``IssueClusterV1`` lifecycle).

The cluster fingerprint is ``canonical_json.digest_value`` over the
normalized tuple of invariant ID, evaluator ID, error code, stack
fingerprint, artifact region/entity, and trace-shape fingerprint. Identical
inputs therefore always produce the same fingerprint and the same cluster
ID, on every machine, with no learned components.

An optional host-agent label may be attached, but only as evaluative
metadata (``label_source="host-agent"``); it never changes the fingerprint
or the deterministic clustering decision.

Issue records are *current-state* documents (open/close/reopen mutate the
status), so unlike ledger records they are rewritten in place atomically.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from gauntlet.canonical_json import canonical_bytes, digest_value, parse_digest
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import IssueClusterV1
from gauntlet.paths import atomic_write
from gauntlet.support import Clock

Severity = Literal["critical", "major", "minor", "info"]


@dataclass(frozen=True)
class FingerprintInputs:
    """Normalized deterministic clustering inputs; empty string = absent."""

    invariant_id: str = ""
    evaluator_id: str = ""
    error_code: str = ""
    stack_fingerprint: str = ""
    artifact_region: str = ""
    trace_shape_fingerprint: str = ""

    def as_dict(self) -> dict[str, str]:
        return {
            "invariant_id": self.invariant_id,
            "evaluator_id": self.evaluator_id,
            "error_code": self.error_code,
            "stack_fingerprint": self.stack_fingerprint,
            "artifact_region": self.artifact_region,
            "trace_shape_fingerprint": self.trace_shape_fingerprint,
        }


def compute_fingerprint(inputs: FingerprintInputs) -> str:
    """``sha256:<hex>`` over the canonical JSON of the normalized inputs."""
    return digest_value(inputs.as_dict())


def issue_id_for_fingerprint(fingerprint: str) -> str:
    _, hex_value = parse_digest(fingerprint)
    return f"issue:{hex_value[:16]}"


class IssueService:
    """Cluster observations/counterexamples into deterministic issues."""

    def __init__(self, issues_dir: Path, *, clock: Clock) -> None:
        self._dir = issues_dir
        self._clock = clock

    def _path(self, issue_id: str) -> Path:
        return self._dir / f"{issue_id.replace(':', '__')}.json"

    def _save(self, issue: IssueClusterV1) -> None:
        atomic_write(self._path(issue.issue_id), canonical_bytes(issue.model_dump(mode="json")))

    def load(self, issue_id: str) -> IssueClusterV1:
        path = self._path(issue_id)
        if not path.is_file():
            raise InvalidInvocationError(f"issue not found: {issue_id}")
        return IssueClusterV1.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def list_issues(self) -> list[IssueClusterV1]:
        if not self._dir.is_dir():
            return []
        return [
            IssueClusterV1.model_validate(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted(self._dir.glob("*.json"))
        ]

    def cluster(
        self,
        inputs: FingerprintInputs,
        *,
        observation_ids: list[str] | None = None,
        counterexample_ids: list[str] | None = None,
        severity: Severity = "minor",
    ) -> IssueClusterV1:
        """Create or extend the cluster for these deterministic inputs."""
        fingerprint = compute_fingerprint(inputs)
        issue_id = issue_id_for_fingerprint(fingerprint)
        path = self._path(issue_id)
        if path.is_file():
            issue = self.load(issue_id)
            merged_observations = list(
                dict.fromkeys([*issue.observations, *(observation_ids or [])])
            )
            merged_counterexamples = list(
                dict.fromkeys([*issue.counterexamples, *(counterexample_ids or [])])
            )
            issue = issue.model_copy(
                update={
                    "observations": merged_observations,
                    "counterexamples": merged_counterexamples,
                }
            )
        else:
            issue = IssueClusterV1(
                issue_id=issue_id,
                fingerprint=fingerprint,
                fingerprint_inputs=inputs.as_dict(),
                observations=list(observation_ids or []),
                counterexamples=list(counterexample_ids or []),
                severity=severity,
                created_at=self._clock.now(),
            )
        self._save(issue)
        return issue

    def attach_host_agent_label(self, issue_id: str, label: str) -> IssueClusterV1:
        """Attach an evaluative host-agent label; never affects clustering."""
        issue = self.load(issue_id)
        issue = issue.model_copy(update={"label": label, "label_source": "host-agent"})
        self._save(issue)
        return issue

    def close(self, issue_id: str) -> IssueClusterV1:
        issue = self.load(issue_id)
        if issue.status not in ("open", "reopened"):
            raise InvalidInvocationError(f"cannot close issue in status {issue.status!r}")
        issue = issue.model_copy(update={"status": "closed"})
        self._save(issue)
        return issue

    def reopen(self, issue_id: str) -> IssueClusterV1:
        issue = self.load(issue_id)
        if issue.status != "closed":
            raise InvalidInvocationError(f"cannot reopen issue in status {issue.status!r}")
        issue = issue.model_copy(update={"status": "reopened"})
        self._save(issue)
        return issue
