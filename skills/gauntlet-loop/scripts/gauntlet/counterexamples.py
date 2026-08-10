"""Counterexample lifecycle: add, minimize, list/show, and memory export.

Counterexamples live under ``.gauntlet/counterexamples/``:

- ``records/<id>.json``  -- the :class:`~gauntlet.models.CounterexampleV1`;
- ``fixtures/<id>.txt``  -- the minimal reproduction as a fixture file
  (counterexample memory: durable regression cases).

Minimization uses a pluggable :class:`Reducer`. The shipped
:class:`LineRemovalReducer` is a deterministic ddmin-style single-line
remover for text fixtures. Minimization always *retains the original*
counterexample and links the smaller one via ``minimized_from``; split
visibility (search-visible | calibration-only | promotion-sealed) is
inherited so a sealed case can never leak into a builder-visible split by
being minimized.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Literal, Protocol

from gauntlet.canonical_json import canonical_bytes
from gauntlet.errors import InvalidInvocationError
from gauntlet.models import ArtifactRefV1, CounterexampleV1, EvidenceRefV1
from gauntlet.paths import atomic_write
from gauntlet.support import Clock, IdGenerator

SplitVisibility = Literal["search-visible", "calibration-only", "promotion-sealed"]
Severity = Literal["critical", "major", "minor", "info"]

EvidenceResolver = Callable[[str], bool]
"""Given a ``sha256:<hex>`` digest, return True when it resolves locally."""


class Reducer(Protocol):
    """Pluggable minimizer: shrink ``text`` while ``still_failing`` holds."""

    @property
    def name(self) -> str: ...

    def reduce(self, text: str, still_failing: Callable[[str], bool]) -> str: ...


class LineRemovalReducer:
    """Deterministic ddmin-style reducer: greedy single-line removal.

    Repeatedly attempts to delete each line (front to back) and keeps the
    deletion whenever the reproduction still fails; loops until a fixpoint.
    Deterministic by construction: no randomness, stable scan order.
    """

    name = "line-removal/v1"

    def reduce(self, text: str, still_failing: Callable[[str], bool]) -> str:
        if not still_failing(text):
            raise InvalidInvocationError(
                "the original reproduction does not fail; refusing to minimize",
                hint="minimization requires a failing reproduction as its starting point",
            )
        lines = text.splitlines()
        changed = True
        while changed:
            changed = False
            index = 0
            while index < len(lines):
                candidate = lines[:index] + lines[index + 1 :]
                if candidate and still_failing("\n".join(candidate)):
                    lines = candidate
                    changed = True
                else:
                    index += 1
        return "\n".join(lines)


class CounterexampleService:
    """Persist and evolve counterexamples plus their fixture memory."""

    def __init__(
        self,
        counterexamples_dir: Path,
        *,
        clock: Clock,
        ids: IdGenerator,
        evidence_resolver: EvidenceResolver | None = None,
    ) -> None:
        self._root = counterexamples_dir
        self._clock = clock
        self._ids = ids
        self._evidence_resolver = evidence_resolver

    @property
    def records_dir(self) -> Path:
        return self._root / "records"

    @property
    def fixtures_dir(self) -> Path:
        return self._root / "fixtures"

    def _record_path(self, counterexample_id: str) -> Path:
        return self.records_dir / f"{counterexample_id.replace(':', '__')}.json"

    def _fixture_path(self, counterexample_id: str) -> Path:
        return self.fixtures_dir / f"{counterexample_id.replace(':', '__')}.txt"

    def _validate_evidence(self, evidence: list[EvidenceRefV1]) -> None:
        if not evidence:
            raise InvalidInvocationError("a counterexample requires at least one evidence ref")
        if self._evidence_resolver is None:
            return
        for ref in evidence:
            if ref.digest is not None and not self._evidence_resolver(ref.digest):
                raise InvalidInvocationError(
                    f"evidence digest does not resolve: {ref.digest}",
                    hint="store the raw evidence in the artifact store before adding",
                )

    def _save(self, record: CounterexampleV1, fixture_text: str | None) -> None:
        atomic_write(
            self._record_path(record.counterexample_id),
            canonical_bytes(record.model_dump(mode="json")),
        )
        if fixture_text is not None:
            atomic_write(
                self._fixture_path(record.counterexample_id),
                fixture_text.encode("utf-8"),
            )

    # -- lifecycle ------------------------------------------------------------

    def add(
        self,
        *,
        candidate_id: str,
        artifact: ArtifactRefV1,
        scope: str,
        expected: str,
        actual: str,
        violated_rule: str,
        evidence: list[EvidenceRefV1],
        severity: Severity,
        confidence: float,
        minimal_reproduction: str | None = None,
        split_visibility: SplitVisibility = "search-visible",
    ) -> CounterexampleV1:
        """Create a counterexample after validating its evidence refs."""
        self._validate_evidence(evidence)
        record = CounterexampleV1(
            counterexample_id=self._ids.new_id("cx"),
            candidate_id=candidate_id,
            artifact=artifact,
            scope=scope,
            expected=expected,
            actual=actual,
            violated_rule=violated_rule,
            evidence=evidence,
            severity=severity,
            confidence=confidence,
            minimal_reproduction=minimal_reproduction,
            split_visibility=split_visibility,
            created_at=self._clock.now(),
        )
        self._save(record, minimal_reproduction)
        return record

    def minimize(
        self,
        counterexample_id: str,
        *,
        reducer: Reducer,
        still_failing: Callable[[str], bool],
    ) -> CounterexampleV1:
        """Minimize a reproduction; the original record is always retained."""
        original = self.show(counterexample_id)
        if original.minimal_reproduction is None:
            raise InvalidInvocationError(
                f"counterexample {counterexample_id} has no reproduction to minimize"
            )
        reduced = reducer.reduce(original.minimal_reproduction, still_failing)
        minimized = CounterexampleV1(
            counterexample_id=self._ids.new_id("cx"),
            candidate_id=original.candidate_id,
            artifact=original.artifact,
            scope=original.scope,
            expected=original.expected,
            actual=original.actual,
            violated_rule=original.violated_rule,
            evidence=list(original.evidence),
            severity=original.severity,
            confidence=original.confidence,
            minimal_reproduction=reduced,
            minimized_from=original.counterexample_id,
            split_visibility=original.split_visibility,
            created_at=self._clock.now(),
        )
        self._save(minimized, reduced)
        return minimized

    # -- inspection -----------------------------------------------------------

    def show(self, counterexample_id: str) -> CounterexampleV1:
        path = self._record_path(counterexample_id)
        if not path.is_file():
            raise InvalidInvocationError(f"counterexample not found: {counterexample_id}")
        return CounterexampleV1.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def list_records(
        self, *, split_visibility: SplitVisibility | None = None
    ) -> list[CounterexampleV1]:
        if not self.records_dir.is_dir():
            return []
        records = [
            CounterexampleV1.model_validate(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted(self.records_dir.glob("*.json"))
        ]
        if split_visibility is not None:
            records = [r for r in records if r.split_visibility == split_visibility]
        return records

    def fixture_text(self, counterexample_id: str) -> str:
        path = self._fixture_path(counterexample_id)
        if not path.is_file():
            raise InvalidInvocationError(
                f"counterexample fixture not found: {counterexample_id}"
            )
        return path.read_text(encoding="utf-8")
