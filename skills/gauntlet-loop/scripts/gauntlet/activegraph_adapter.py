"""Narrow typed adapter around the ActiveGraph runtime lifecycle.

ActiveGraph is the single scheduler, event store, replay engine, and
promotion algorithm; this module only adapts its public API onto gauntlet's
vocabularies and error contract. No ActiveGraph SQLite table is ever touched
directly: storage access goes through ``SQLiteEventStore``'s public methods
and the standard ``sqlite3`` backup API for file-safe copies.

External mutation mechanism
---------------------------
ActiveGraph mutates the graph from *behaviors* reacting to events. A caller
outside a behavior mutates the graph exactly the way ``Runtime.run_goal``
does internally, using only public attributes:

1. construct an ``activegraph.Event`` with an id from ``runtime.graph.ids
   .event()`` and a timestamp from ``runtime.graph.clock.now()``;
2. append it durably with ``runtime.graph.emit(event)``;
3. drain the behavior queue with ``runtime.run_until_idle()``.

The emitted events use the namespaced ``gauntlet.*`` grammar consumed by the
deterministic behaviors in :mod:`gauntlet.activegraph_pack`, which perform
the actual ``add_object`` / ``add_relation`` / ``patch_object`` calls under
pack schema enforcement. This keeps every mutation event-sourced, replayable,
and strict-replay verifiable.

Opening a runtime with the gauntlet pack appends one ``pack.loaded`` event
per session; that is upstream contract behavior and replays cleanly.
Read-only operations (health check, export, audit) use the event store
directly and never append events.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from importlib import metadata
from pathlib import Path
from typing import Any

import activegraph

from gauntlet.activegraph_pack import PACK_BEHAVIORS, build_pack
from gauntlet.errors import (
    ConflictError,
    GateFailedError,
    InvalidInvocationError,
)
from gauntlet.paths import ProjectPaths

PROJECTOR_VERSION = "1"

# ---------------------------------------------------------------------------
# Typed summaries returned to callers (never raw activegraph objects)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RunInfo:
    run_id: str
    parent_run_id: str | None
    forked_at_event_id: str | None
    label: str | None
    created_at: str


@dataclass(frozen=True)
class StoreHealth:
    store: str
    exists: bool
    run_count: int
    runs: tuple[RunInfo, ...]
    total_events: int
    activegraph_version: str


@dataclass(frozen=True)
class GraphSnapshot:
    """Point-in-time projection: plain dicts, safe for pure functions."""

    run_id: str
    objects: tuple[dict[str, Any], ...]
    relations: tuple[dict[str, Any], ...]
    events: tuple[dict[str, Any], ...]


@dataclass(frozen=True)
class GraphDiffSummary:
    parent_run_id: str
    fork_run_id: str
    is_identical: bool
    shared_event_count: int
    parent_only_event_types: tuple[str, ...]
    fork_only_event_types: tuple[str, ...]
    divergent_object_ids: tuple[str, ...]
    divergent_relation_ids: tuple[str, ...]


@dataclass(frozen=True)
class PromotionPlanSummary:
    from_run: str
    into_run: str
    forked_at_event: str
    is_promotable: bool
    is_empty: bool
    object_creates: int
    object_patches: int
    object_removes: int
    relation_creates: int
    relation_removes: int
    conflicts: tuple[str, ...]
    warnings: tuple[str, ...]


@dataclass(frozen=True)
class PromotionApplied:
    plan: PromotionPlanSummary
    marker_event_id: str
    applied_event_ids: tuple[str, ...]


@dataclass
class GraphHandle:
    """One open ActiveGraph runtime bound to a store and run."""

    runtime: Any
    store: str
    run_id: str
    behaviors: tuple[Any, ...] = field(default_factory=tuple)


# ---------------------------------------------------------------------------
# Store resolution
# ---------------------------------------------------------------------------


def default_store(paths: ProjectPaths) -> str:
    """Default SQLite store location, anchored via ProjectPaths."""
    return str(paths.store_file)


def resolve_store(store: str | Path) -> str:
    """Accept a SQLite path or a store URL (sqlite:/postgres:).

    URLs are validated through ``activegraph.parse_store_url`` and passed
    through untouched; credentials are never persisted by this module.
    """
    text = str(store)
    if "://" in text:
        try:
            activegraph.parse_store_url(text)
        except Exception as error:
            raise InvalidInvocationError(f"invalid store URL: {error}") from error
        return text
    return str(Path(text))


def _require_sqlite_path(store: str, operation: str) -> Path:
    if "://" in store and not store.startswith("sqlite:"):
        raise InvalidInvocationError(
            f"{operation} supports only local SQLite stores, not {store.split('://', 1)[0]}://",
            hint="run the operation against the deployment's own backup tooling",
        )
    path = store.removeprefix("sqlite:///") if store.startswith("sqlite:") else store
    return Path(path)


def campaign_run_id(campaign_id: str) -> str:
    """Campaign-scoped run id: stable, filesystem/log friendly."""
    return "campaign--" + campaign_id.replace(":", "--").replace("/", "-")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


def open_runtime(
    store: str | Path,
    run_id: str,
    *,
    strict: bool = False,
    seed: int = 0,
    extra_behaviors: tuple[Any, ...] = (),
    load_pack: bool = True,
) -> GraphHandle:
    """Open (or create) the run and register the gauntlet pack behaviors.

    ``strict=True`` verifies the recorded prefix with ActiveGraph strict
    replay; divergence surfaces as :class:`~gauntlet.errors.GateFailedError`.

    Behavior registration happens exactly once: through ``load_pack`` in the
    default path, or through ``Runtime.load(behaviors=...)`` when the pack is
    skipped (strict replay verifies the prefix without appending the pack's
    ``pack.loaded`` event). Registering both ways would fire every behavior
    twice per event.
    """
    resolved = resolve_store(store)
    behaviors = tuple(PACK_BEHAVIORS) + tuple(extra_behaviors)
    load_behaviors = tuple(extra_behaviors) if load_pack else behaviors
    try:
        runtime = activegraph.Runtime.load(
            resolved,
            run_id=run_id,
            behaviors=list(load_behaviors),
            seed=seed,
            replay_strict=strict,
        )
    except activegraph.ReplayDivergenceError as error:
        raise GateFailedError(
            f"strict replay diverged for run {run_id!r}: {error}",
            hint="the recorded history no longer matches the registered behaviors",
        ) from error
    except FileNotFoundError as error:
        raise InvalidInvocationError(f"cannot open store {resolved!r}: {error}") from error
    if load_pack:
        runtime.load_pack(build_pack())
    return GraphHandle(runtime=runtime, store=resolved, run_id=run_id, behaviors=behaviors)


def open_existing(
    store: str | Path,
    run_id: str,
    *,
    strict: bool = False,
    load_pack: bool = True,
) -> GraphHandle:
    """Open a run that must already exist (``Runtime.load`` would create it)."""
    resolved = resolve_store(store)
    if not any(run.run_id == run_id for run in list_runs(resolved)):
        raise InvalidInvocationError(
            f"run {run_id!r} does not exist in store {resolved!r}",
            hint="use open_runtime to create a new run",
        )
    return open_runtime(resolved, run_id, strict=strict, load_pack=load_pack)


def rebuild(store: str | Path, run_id: str) -> GraphHandle:
    """Permissive state rebuild: project the recorded log, register nothing.

    No behaviors re-fire and no pack is loaded, so a rebuild appends zero
    events; use it for historical projection and read-only audits.
    """
    resolved = resolve_store(store)
    if not any(run.run_id == run_id for run in list_runs(resolved)):
        raise InvalidInvocationError(f"run {run_id!r} does not exist in store {resolved!r}")
    runtime = activegraph.Runtime.load(resolved, run_id=run_id, behaviors=[])
    return GraphHandle(runtime=runtime, store=resolved, run_id=run_id, behaviors=())


def strict_replay(store: str | Path, run_id: str) -> GraphHandle:
    """Strict deterministic replay of the recorded prefix.

    Re-fires the pack behaviors from the recorded seed events and compares
    the (id, type) event stream against the log; any divergence raises
    :class:`~gauntlet.errors.GateFailedError`. The pack is not re-loaded, so
    verification itself appends zero events.
    """
    resolved = resolve_store(store)
    if not any(run.run_id == run_id for run in list_runs(resolved)):
        raise InvalidInvocationError(f"run {run_id!r} does not exist in store {resolved!r}")
    return open_runtime(resolved, run_id, strict=True, load_pack=False)


# ---------------------------------------------------------------------------
# Mutation seam
# ---------------------------------------------------------------------------


def emit_event(
    handle: GraphHandle,
    event_type: str,
    payload: dict[str, Any],
    *,
    actor: str = "gauntlet",
) -> str:
    """Emit one namespaced gauntlet event and drain behaviors; returns its id.

    This is the only mutation entry point (see the module docstring).
    """
    graph = handle.runtime.graph
    event = activegraph.Event(
        id=graph.ids.event(),
        type=event_type,
        payload=payload,
        actor=actor,
        timestamp=graph.clock.now(),
    )
    graph.emit(event)
    handle.runtime.run_until_idle()
    return str(event.id)


def record_node(
    handle: GraphHandle,
    node_type: str,
    data: dict[str, Any],
    *,
    relations: tuple[dict[str, str], ...] = (),
    actor: str = "gauntlet",
) -> str:
    """Append a typed node (plus relations) through the generic recorder."""
    return emit_event(
        handle,
        "gauntlet.node.recorded",
        {"node_type": node_type, "data": data, "relations": list(relations)},
        actor=actor,
    )


def record_runtime_versions(handle: GraphHandle, *, actor: str = "gauntlet") -> str:
    """Record gauntlet + activegraph schema/projector versions in the graph."""
    try:
        gauntlet_version = metadata.version("gauntlet-loop")
    except metadata.PackageNotFoundError:  # pragma: no cover - dev tree only
        gauntlet_version = "0.0.0"
    return emit_event(
        handle,
        "gauntlet.runtime.versions",
        {
            "gauntlet_version": gauntlet_version,
            "activegraph_version": getattr(activegraph, "__version__", "0.0.0"),
            "skill_contract": "dev.gauntlet/v1",
            "projector_version": PROJECTOR_VERSION,
        },
        actor=actor,
    )


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------


def snapshot(handle: GraphHandle) -> GraphSnapshot:
    """Plain-dict projection of the current graph state and event log."""
    graph = handle.runtime.graph
    return GraphSnapshot(
        run_id=handle.run_id,
        objects=tuple(obj.to_dict() for obj in graph.all_objects()),
        relations=tuple(rel.to_dict() for rel in graph.all_relations()),
        events=tuple(event.to_dict() for event in graph.events),
    )


def list_runs(store: str | Path) -> tuple[RunInfo, ...]:
    resolved = resolve_store(store)
    path = _require_sqlite_path(resolved, "run listing")
    if not path.exists():
        return ()
    records = activegraph.SQLiteEventStore.list_runs(str(path))
    return tuple(
        RunInfo(
            run_id=str(record.run_id),
            parent_run_id=record.parent_run_id,
            forked_at_event_id=record.forked_at_event_id,
            label=record.label,
            created_at=str(record.created_at),
        )
        for record in records
    )


def health_check(store: str | Path) -> StoreHealth:
    """Read-only store health: existence, runs, and total event count."""
    resolved = resolve_store(store)
    path = _require_sqlite_path(resolved, "health check")
    runs = list_runs(resolved) if path.exists() else ()
    total = 0
    for run in runs:
        event_store = activegraph.SQLiteEventStore(str(path), run_id=run.run_id)
        try:
            total += int(event_store.count())
        finally:
            event_store.close()
    return StoreHealth(
        store=resolved,
        exists=path.exists(),
        run_count=len(runs),
        runs=runs,
        total_events=total,
        activegraph_version=getattr(activegraph, "__version__", "0.0.0"),
    )


def read_events(store: str | Path, run_id: str) -> tuple[dict[str, Any], ...]:
    """Read-only event export for one run; appends nothing."""
    resolved = resolve_store(store)
    path = _require_sqlite_path(resolved, "event export")
    if not path.exists():
        raise InvalidInvocationError(f"store not found: {resolved!r}")
    event_store = activegraph.SQLiteEventStore(str(path), run_id=run_id)
    try:
        return tuple(event.to_dict() for event in event_store.iter_events())
    finally:
        event_store.close()


def export_events_jsonl(store: str | Path, run_id: str, destination: Path) -> int:
    """Write one run's events as JSONL; returns the exported event count."""
    events = read_events(store, run_id)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as handle:
        for event in events:
            handle.write(json.dumps(event, sort_keys=True) + "\n")
    return len(events)


def backup_store(store: str | Path, destination: Path) -> Path:
    """Safe file-level SQLite backup via the standard backup API.

    Uses ``sqlite3.Connection.backup`` so a copy taken while WAL files exist
    is still consistent; no ActiveGraph table is read or written directly.
    """
    resolved = resolve_store(store)
    path = _require_sqlite_path(resolved, "backup")
    if not path.exists():
        raise InvalidInvocationError(f"store not found: {resolved!r}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    source_conn = sqlite3.connect(str(path))
    try:
        target_conn = sqlite3.connect(str(destination))
        try:
            source_conn.backup(target_conn)
        finally:
            target_conn.close()
    finally:
        source_conn.close()
    return destination


# ---------------------------------------------------------------------------
# Fork, diff, promotion
# ---------------------------------------------------------------------------


def fork_at(
    handle: GraphHandle,
    event_id: str,
    *,
    label: str | None = None,
    extra_behaviors: tuple[Any, ...] = (),
) -> GraphHandle:
    """Fork the run at an exact recorded event; returns the fork handle.

    The fork registers the pack (behaviors + schemas) itself; only extra
    behaviors are passed through ``fork(behaviors=...)``.
    """
    behaviors = tuple(PACK_BEHAVIORS) + tuple(extra_behaviors)
    try:
        fork_runtime = handle.runtime.fork(event_id, label, behaviors=list(extra_behaviors))
    except activegraph.EventNotFoundError as error:
        raise InvalidInvocationError(
            f"cannot fork at unknown event {event_id!r}: {error}"
        ) from error
    fork_runtime.load_pack(build_pack())
    return GraphHandle(
        runtime=fork_runtime,
        store=handle.store,
        run_id=str(fork_runtime.run_id),
        behaviors=behaviors,
    )


def structural_diff(parent: GraphHandle, fork: GraphHandle) -> GraphDiffSummary:
    """Structural diff between a parent run and one of its forks."""
    diff = parent.runtime.diff(fork.runtime)
    return GraphDiffSummary(
        parent_run_id=str(diff.parent_run_id),
        fork_run_id=str(diff.fork_run_id),
        is_identical=bool(diff.is_identical),
        shared_event_count=len(diff.shared_events),
        parent_only_event_types=tuple(event.type for event in diff.parent_only_events),
        fork_only_event_types=tuple(event.type for event in diff.fork_only_events),
        divergent_object_ids=tuple(sorted(obj.id for obj in diff.divergent_objects)),
        divergent_relation_ids=tuple(sorted(rel.id for rel in diff.divergent_relations)),
    )


def _plan_summary(plan: Any) -> PromotionPlanSummary:
    return PromotionPlanSummary(
        from_run=str(plan.from_run),
        into_run=str(plan.into_run),
        forked_at_event=str(plan.forked_at_event),
        is_promotable=bool(plan.is_promotable),
        is_empty=bool(plan.is_empty),
        object_creates=len(plan.object_creates),
        object_patches=len(plan.object_patches),
        object_removes=len(plan.object_removes),
        relation_creates=len(plan.relation_creates),
        relation_removes=len(plan.relation_removes),
        conflicts=tuple(
            f"{conflict.kind}:{conflict.entity}:{conflict.id}: {conflict.detail}"
            for conflict in plan.conflicts
        ),
        warnings=tuple(str(warning) for warning in plan.warnings),
    )


def promote_dry_run(parent: GraphHandle, fork: GraphHandle) -> PromotionPlanSummary:
    """Compute the three-way promotion plan without applying anything."""
    try:
        plan = parent.runtime.promote(fork.runtime, dry_run=True)
    except activegraph.PromoteLineageError as error:
        raise ConflictError(f"promotion lineage error: {error}") from error
    return _plan_summary(plan)


def promote(parent: GraphHandle, fork: GraphHandle) -> PromotionApplied:
    """Fail-closed three-way promotion of the fork's delta into the parent.

    Conflicts (including concurrent parent changes since the fork point) are
    rejected atomically and surface as :class:`~gauntlet.errors.ConflictError`
    with the upstream conflict details; there is no semantic merge.
    """
    try:
        result = parent.runtime.promote(fork.runtime)
    except activegraph.PromoteConflictError as error:
        conflicts = tuple(str(conflict) for conflict in getattr(error, "conflicts", ()))
        raise ConflictError(
            f"promotion of run {fork.run_id!r} into {parent.run_id!r} conflicts: "
            + ("; ".join(conflicts) if conflicts else str(error)),
            hint="rebase the candidate on the current parent state and re-evaluate",
        ) from error
    except activegraph.PromoteLineageError as error:
        raise ConflictError(f"promotion lineage error: {error}") from error
    return PromotionApplied(
        plan=_plan_summary(result.plan),
        marker_event_id=str(result.marker_event_id),
        applied_event_ids=tuple(str(event_id) for event_id in result.applied_event_ids),
    )
