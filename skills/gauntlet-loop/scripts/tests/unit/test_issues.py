"""Deterministic issue clustering and lifecycle."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.errors import InvalidInvocationError
from gauntlet.issues import FingerprintInputs, IssueService, compute_fingerprint
from gauntlet.support import FrozenClock


@pytest.fixture()
def service(tmp_path: Path, clock: FrozenClock) -> IssueService:
    return IssueService(tmp_path / "issues", clock=clock)


INPUTS = FingerprintInputs(
    invariant_id="inv:tool-budget",
    evaluator_id="eval:schema",
    error_code="E-TIMEOUT",
    stack_fingerprint="frame-a>frame-b",
    artifact_region="src/planner.py:42",
    trace_shape_fingerprint="sha-of-shape",
)


def test_same_inputs_produce_same_fingerprint_and_cluster_id(
    service: IssueService,
) -> None:
    first = service.cluster(INPUTS, observation_ids=["obs:000001"])
    second = service.cluster(INPUTS, observation_ids=["obs:000002"])

    assert first.issue_id == second.issue_id
    assert first.fingerprint == second.fingerprint
    assert compute_fingerprint(INPUTS) == first.fingerprint
    # merged, deduplicated membership
    assert second.observations == ["obs:000001", "obs:000002"]


def test_different_inputs_produce_different_clusters(service: IssueService) -> None:
    other = FingerprintInputs(
        invariant_id="inv:tool-budget",
        evaluator_id="eval:schema",
        error_code="E-DIFFERENT",
    )
    assert service.cluster(INPUTS).issue_id != service.cluster(other).issue_id


def test_fingerprint_is_stable_across_service_instances(
    tmp_path: Path, clock: FrozenClock
) -> None:
    a = IssueService(tmp_path / "a", clock=clock).cluster(INPUTS)
    b = IssueService(tmp_path / "b", clock=clock).cluster(INPUTS)
    assert a.issue_id == b.issue_id
    assert a.fingerprint == b.fingerprint


def test_host_agent_label_is_evaluative_metadata_only(service: IssueService) -> None:
    issue = service.cluster(INPUTS)
    labeled = service.attach_host_agent_label(issue.issue_id, "planner timeout cascade")

    assert labeled.label == "planner timeout cascade"
    assert labeled.label_source == "host-agent"
    assert labeled.fingerprint == issue.fingerprint
    assert labeled.issue_id == issue.issue_id


def test_open_close_reopen_lifecycle(service: IssueService) -> None:
    issue = service.cluster(INPUTS)
    assert issue.status == "open"

    closed = service.close(issue.issue_id)
    assert closed.status == "closed"
    with pytest.raises(InvalidInvocationError):
        service.close(issue.issue_id)

    reopened = service.reopen(issue.issue_id)
    assert reopened.status == "reopened"
    with pytest.raises(InvalidInvocationError):
        service.reopen(issue.issue_id)
    assert service.close(issue.issue_id).status == "closed"
