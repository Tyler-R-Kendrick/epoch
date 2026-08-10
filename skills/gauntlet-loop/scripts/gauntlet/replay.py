"""Replay service: the four explicit modes over the ActiveGraph log.

Modes (:class:`gauntlet.constants.ReplayMode`):

- ``rebuild`` — permissive state rebuild: project the recorded events into
  state without re-firing behaviors. Historical projection, R0.
- ``strict`` — deterministic conformance replay: re-fire the registered
  behaviors from the recorded seed events and compare the event stream with
  the log. Divergence is a failed gate
  (:class:`~gauntlet.errors.GateFailedError`), never a warning.
- ``fork`` — fork the run at an exact recorded event into a new run that
  reuses the recorded prefix.
- ``diff`` — structural diff between a parent run and one of its forks.

Terminology guard: only the *recorded prefix* is deterministically replayed.
Anything executed after a replayed prefix (a live suffix) is new execution
and is never described as "deterministic replay" by this module or its
records.

Every mode pins the resulting state and event digests in a
:class:`ReplayRecordV1` (canonical JSON, ``sha256:``) so later audits can
prove the projection did not drift. Records are persisted through
:class:`gauntlet.ledger.LedgerStore` under ``decisions`` when a ledger is
provided; the store location itself is summarized as a kind (never a URL),
so no credentials can leak into the ledger.
"""

from __future__ import annotations

from typing import Any, Literal

from gauntlet.activegraph_adapter import (
    GraphHandle,
    GraphSnapshot,
    fork_at,
    list_runs,
    open_existing,
    rebuild,
    snapshot,
    strict_replay,
)
from gauntlet.canonical_json import digest_value
from gauntlet.constants import ReplayMode
from gauntlet.errors import InvalidInvocationError
from gauntlet.ledger import LedgerStore
from gauntlet.models import GauntletModel, NonEmptyStr, StableId, UtcTimestamp
from gauntlet.support import Clock, IdGenerator


class ReplayRecordV1(GauntletModel):
    """Digest-pinned outcome of one replay operation.

    Owned by this module (graph runtime evidence), persisted under the
    ``decisions`` ledger kind; the ledger document contracts in
    :mod:`gauntlet.models` are unchanged.
    """

    schema_version: Literal["dev.gauntlet.replay-record/v1"] = "dev.gauntlet.replay-record/v1"
    record_id: StableId
    mode: ReplayMode
    store_kind: Literal["sqlite", "url"]
    run_id: NonEmptyStr
    fork_run_id: str | None = None
    forked_at_event: str | None = None
    event_count: int
    object_count: int
    relation_count: int
    events_digest: NonEmptyStr
    state_digest: NonEmptyStr
    strict_verified: bool = False
    is_identical: bool | None = None
    divergent_object_ids: list[str] = []
    fork_only_event_types: list[str] = []
    created_at: UtcTimestamp


def _state_digest(snap: GraphSnapshot) -> str:
    return digest_value(
        {
            "objects": sorted(snap.objects, key=lambda obj: str(obj["id"])),
            "relations": sorted(snap.relations, key=lambda rel: str(rel["id"])),
        }
    )


def _events_digest(snap: GraphSnapshot) -> str:
    return digest_value(list(snap.events))


def _store_kind(store: str) -> Literal["sqlite", "url"]:
    return "url" if "://" in store and not store.startswith("sqlite:") else "sqlite"


class ReplayService:
    """Replay operations bound to one store, with injected clock and ids."""

    def __init__(
        self,
        store: str,
        *,
        clock: Clock,
        ids: IdGenerator,
        ledger: LedgerStore | None = None,
    ) -> None:
        self._store = store
        self._clock = clock
        self._ids = ids
        self._ledger = ledger

    def _persist(self, record: ReplayRecordV1) -> ReplayRecordV1:
        if self._ledger is not None:
            self._ledger.append("decisions", record.record_id, record)
        return record

    def _base_record(
        self,
        mode: ReplayMode,
        run_id: str,
        snap: GraphSnapshot,
        **extra: Any,
    ) -> ReplayRecordV1:
        return ReplayRecordV1(
            record_id=self._ids.new_id("replay"),
            mode=mode,
            store_kind=_store_kind(self._store),
            run_id=run_id,
            event_count=len(snap.events),
            object_count=len(snap.objects),
            relation_count=len(snap.relations),
            events_digest=_events_digest(snap),
            state_digest=_state_digest(snap),
            created_at=self._clock.now(),
            **extra,
        )

    def rebuild(self, run_id: str) -> ReplayRecordV1:
        """Permissive rebuild of the recorded state; appends zero events."""
        handle = rebuild(self._store, run_id)
        return self._persist(self._base_record(ReplayMode.REBUILD, run_id, snapshot(handle)))

    def strict(self, run_id: str) -> ReplayRecordV1:
        """Strict conformance replay of the recorded prefix.

        Raises :class:`~gauntlet.errors.GateFailedError` on divergence (via
        the adapter). A passing run pins ``strict_verified=True``; it says
        nothing about any execution that might continue afterwards.
        """
        handle = strict_replay(self._store, run_id)
        record = self._base_record(
            ReplayMode.STRICT, run_id, snapshot(handle), strict_verified=True
        )
        return self._persist(record)

    def fork(
        self, run_id: str, at_event: str, *, label: str | None = None
    ) -> tuple[ReplayRecordV1, GraphHandle]:
        """Fork ``run_id`` at an exact event; returns the record and handle."""
        parent = open_existing(self._store, run_id)
        fork_handle = fork_at(parent, at_event, label=label)
        snap = snapshot(fork_handle)
        record = self._base_record(
            ReplayMode.FORK,
            run_id,
            snap,
            fork_run_id=fork_handle.run_id,
            forked_at_event=at_event,
        )
        return self._persist(record), fork_handle

    def diff(self, parent_run_id: str, fork_run_id: str) -> ReplayRecordV1:
        """Structural diff between a recorded parent run and its fork."""
        runs = {run.run_id: run for run in list_runs(self._store)}
        fork_info = runs.get(fork_run_id)
        if fork_info is None or fork_run_id == parent_run_id:
            raise InvalidInvocationError(f"unknown fork run {fork_run_id!r}")
        if fork_info.parent_run_id != parent_run_id:
            raise InvalidInvocationError(
                f"run {fork_run_id!r} is not a fork of {parent_run_id!r}",
                hint="diff only compares a parent with one of its direct forks",
            )
        parent = rebuild(self._store, parent_run_id)
        fork_handle = rebuild(self._store, fork_run_id)
        diff = parent.runtime.diff(fork_handle.runtime)
        snap = snapshot(fork_handle)
        record = self._base_record(
            ReplayMode.DIFF,
            parent_run_id,
            snap,
            fork_run_id=fork_run_id,
            forked_at_event=fork_info.forked_at_event_id,
            is_identical=bool(diff.is_identical),
            divergent_object_ids=sorted(obj.id for obj in diff.divergent_objects),
            fork_only_event_types=[event.type for event in diff.fork_only_events],
        )
        return self._persist(record)

    def run(self, mode: ReplayMode, run_id: str, **kwargs: str) -> ReplayRecordV1:
        """Dispatch one replay mode by its stable vocabulary name."""
        if mode is ReplayMode.REBUILD:
            return self.rebuild(run_id)
        if mode is ReplayMode.STRICT:
            return self.strict(run_id)
        if mode is ReplayMode.FORK:
            at_event = kwargs.get("at_event")
            if not at_event:
                raise InvalidInvocationError("fork mode requires at_event")
            record, _ = self.fork(run_id, at_event, label=kwargs.get("label"))
            return record
        fork_run_id = kwargs.get("fork_run_id")
        if not fork_run_id:
            raise InvalidInvocationError("diff mode requires fork_run_id")
        return self.diff(run_id, fork_run_id)
