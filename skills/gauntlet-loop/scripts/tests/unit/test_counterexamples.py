"""Counterexample add/minimize lifecycle and split-visibility retention."""

from __future__ import annotations

from pathlib import Path

import pytest

from gauntlet.constants import ArtifactRole
from gauntlet.counterexamples import CounterexampleService, LineRemovalReducer
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import ArtifactRefV1, DigestRefV1, EvidenceRefV1
from gauntlet.support import FrozenClock, SequentialIdGenerator

ARTIFACT = ArtifactRefV1(
    artifact_id="artifact:demo",
    role=ArtifactRole.DERIVED,
    digest=DigestRefV1(value="ab" * 32),
)

EVIDENCE = [EvidenceRefV1(kind="observation", ref_id="obs:000001", digest=f"sha256:{'cd' * 32}")]


@pytest.fixture()
def service(
    tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
) -> CounterexampleService:
    return CounterexampleService(tmp_path / "counterexamples", clock=clock, ids=ids)


def _add(service: CounterexampleService, **overrides: object) -> str:
    record = service.add(
        candidate_id="candidate:c1",
        artifact=ARTIFACT,
        scope="planner",
        expected="tool budget respected",
        actual="tool budget exceeded",
        violated_rule="inv:tool-budget",
        evidence=EVIDENCE,
        severity="major",
        confidence=0.9,
        minimal_reproduction="setup line\nbad-line triggers failure\nnoise line\n",
        **overrides,  # type: ignore[arg-type]
    )
    return record.counterexample_id


def test_add_persists_record_and_fixture(service: CounterexampleService) -> None:
    cx_id = _add(service)
    record = service.show(cx_id)
    assert record.candidate_id == "candidate:c1"
    assert "bad-line" in service.fixture_text(cx_id)


def test_add_validates_evidence_digests_when_resolver_given(
    tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    service = CounterexampleService(
        tmp_path / "cx",
        clock=clock,
        ids=ids,
        evidence_resolver=lambda digest: False,
    )
    with pytest.raises(InvalidInvocationError, match="does not resolve"):
        _add(service)


def test_minimize_shrinks_and_retains_original(service: CounterexampleService) -> None:
    cx_id = _add(service)

    minimized = service.minimize(
        cx_id,
        reducer=LineRemovalReducer(),
        still_failing=lambda text: "bad-line" in text,
    )

    assert minimized.minimal_reproduction == "bad-line triggers failure"
    assert minimized.minimized_from == cx_id
    # the original record and its full reproduction survive
    original = service.show(cx_id)
    assert original.minimal_reproduction is not None
    assert "setup line" in original.minimal_reproduction
    assert len(service.list_records()) == 2


def test_minimize_refuses_non_failing_reproduction(service: CounterexampleService) -> None:
    cx_id = _add(service)
    with pytest.raises(InvalidInvocationError, match="does not fail"):
        service.minimize(
            cx_id, reducer=LineRemovalReducer(), still_failing=lambda text: False
        )


def test_split_visibility_is_retained_through_minimization(
    service: CounterexampleService,
) -> None:
    cx_id = _add(service, split_visibility="promotion-sealed")
    minimized = service.minimize(
        cx_id,
        reducer=LineRemovalReducer(),
        still_failing=lambda text: "bad-line" in text,
    )
    assert minimized.split_visibility == "promotion-sealed"
    sealed = service.list_records(split_visibility="promotion-sealed")
    assert {record.counterexample_id for record in sealed} == {cx_id, minimized.counterexample_id}
    assert service.list_records(split_visibility="search-visible") == []
