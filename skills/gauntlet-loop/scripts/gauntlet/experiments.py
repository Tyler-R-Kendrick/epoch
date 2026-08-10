"""Experiment lifecycle: propose, fork, run, compare, keep/discard, archive.

Discipline enforced here (experiment-controller brief):

- every experiment binds one falsifiable hypothesis (statement + falsifier +
  a single action seam) and the smallest plausible mutation surface
  (``permitted_globs`` is mandatory);
- forking creates a ``gauntlet/<campaign>/<experiment>`` branch from the
  recorded parent commit plus an external worktree via ``gauntlet.gitops``;
- runs execute ONLY the declared argv commands inside the candidate
  worktree with a scrubbed allowlisted environment. Network denial is
  policy-level (the ``GAUNTLET_NETWORK=deny`` marker plus the absence of
  proxy/credential variables), not an OS sandbox -- documented, not
  overclaimed;
- the candidate diff is validated against permitted globs and frozen
  surfaces both before execution (planned surface) and after execution
  (actual diff); violations fail closed with counterexample-ready detail;
- smoke runs are plumbing checks: they can never conclude keep/discard on a
  hypothesis;
- keep retains a candidate for held-out confirmation and never promotes;
  discard preserves the branch, logs, reason, and evidence.

Like campaigns, experiment state is persisted as immutable ledger revisions
(kind ``experiments``, record ids ``<experiment-id>.rev-<n>``).
"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from gauntlet.campaigns import (
    CampaignService,
    EventEmitter,
    IntentGate,
    NullIntentGate,
    RecordingEventEmitter,
)
from gauntlet.canonical_json import canonical_bytes, digest_bytes
from gauntlet.constants import (
    WORKTREE_BRANCH_PREFIX,
    ActionClass,
    ExperimentStatus,
)
from gauntlet.errors import (
    GateFailedError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.gitops import (
    GitRunner,
    WorktreeManager,
    check_change_scope,
    expand_frozen_surfaces,
    frozen_permitted_intersection,
    slugify,
)
from gauntlet.ledger import LedgerStore
from gauntlet.models import (
    ComparisonV1,
    EnvironmentRefV1,
    ExperimentV1,
    HypothesisV1,
    MetricResultV1,
)
from gauntlet.paths import ProjectPaths, atomic_write
from gauntlet.support import Clock, IdGenerator, ProcessRunner

_REVISION_SEPARATOR = ".rev-"
_UNFORKED_EVENT = "unforked"

#: Two-sided confidence bounds for one paired metric delta:
#: (metric, baseline samples, candidate samples) -> (lower, upper).
IntervalFn = Callable[[str, Sequence[float], Sequence[float]], tuple[float, float]]


class BlobSink(Protocol):
    """Raw-output storage seam; the artifact store implements this."""

    def store(self, data: bytes, *, media_type: str | None = None) -> str:
        """Persist bytes and return their ``sha256:<hex>`` digest."""
        ...


@dataclass
class MemoryBlobSink:
    """Default in-memory sink for tests and library composition."""

    blobs: dict[str, bytes] = field(default_factory=dict)

    def store(self, data: bytes, *, media_type: str | None = None) -> str:
        digest = digest_bytes(data)
        self.blobs[digest] = data
        return digest


@dataclass(frozen=True)
class CommandExecution:
    """Exact record of one declared candidate command."""

    argv: tuple[str, ...]
    cwd: str
    exit_code: int
    timed_out: bool
    stdout_digest: str
    stderr_digest: str
    started_at: str
    finished_at: str


@dataclass(frozen=True)
class RunReport:
    experiment: ExperimentV1
    executions: tuple[CommandExecution, ...]
    changed_paths: tuple[str, ...]
    candidate_commit: str | None


@dataclass(frozen=True)
class ArchiveEntry:
    """One archive candidate: behavior descriptors + metrics (higher=better)."""

    experiment_id: str
    behavior: Mapping[str, str]
    metrics: Mapping[str, float]


def non_dominated(entries: Sequence[ArchiveEntry]) -> tuple[ArchiveEntry, ...]:
    """Deterministic Pareto front over identical metric keys (maximize all)."""
    if not entries:
        return ()
    keys = sorted(entries[0].metrics)
    for entry in entries:
        if sorted(entry.metrics) != keys:
            raise InvalidInvocationError(
                f"archive entry {entry.experiment_id} has mismatched metric keys"
            )

    def dominates(a: ArchiveEntry, b: ArchiveEntry) -> bool:
        at_least = all(a.metrics[key] >= b.metrics[key] for key in keys)
        strictly = any(a.metrics[key] > b.metrics[key] for key in keys)
        return at_least and strictly

    front = [
        entry
        for entry in entries
        if not any(dominates(other, entry) for other in entries if other is not entry)
    ]
    return tuple(sorted(front, key=lambda entry: entry.experiment_id))


class ExperimentService:
    """Lifecycle controller for candidate experiments in one campaign."""

    def __init__(
        self,
        paths: ProjectPaths,
        *,
        clock: Clock,
        ids: IdGenerator,
        git: GitRunner,
        worktrees: WorktreeManager,
        campaigns: CampaignService,
        runner: ProcessRunner,
        ledger: LedgerStore | None = None,
        gate: IntentGate | None = None,
        emitter: EventEmitter | None = None,
        blobs: BlobSink | None = None,
        skill_root: Path | None = None,
        extra_frozen_surfaces: Sequence[str] = (),
        max_output_bytes: int = 10_485_760,
    ) -> None:
        self._paths = paths
        self._clock = clock
        self._ids = ids
        self._git = git
        self._worktrees = worktrees
        self._campaigns = campaigns
        self._runner = runner
        self._ledger = ledger if ledger is not None else LedgerStore(paths.ledger_dir)
        self._gate: IntentGate = gate if gate is not None else NullIntentGate()
        self._emitter: EventEmitter = emitter if emitter is not None else RecordingEventEmitter()
        self._blobs: BlobSink = blobs if blobs is not None else MemoryBlobSink()
        self._max_output_bytes = max_output_bytes
        self._frozen_surfaces = expand_frozen_surfaces(
            git_root=paths.git_root, skill_root=skill_root
        ) + tuple(extra_frozen_surfaces)

    # -- persistence ---------------------------------------------------------

    def _revision_ids(self, experiment_id: str) -> list[str]:
        prefix = experiment_id + _REVISION_SEPARATOR
        return sorted(
            record_id
            for record_id in self._ledger.list_ids("experiments")
            if record_id.startswith(prefix)
        )

    def _persist(self, experiment: ExperimentV1) -> ExperimentV1:
        revision = len(self._revision_ids(experiment.experiment_id)) + 1
        record_id = f"{experiment.experiment_id}{_REVISION_SEPARATOR}{revision:06d}"
        self._ledger.append("experiments", record_id, experiment)
        return experiment

    def load(self, experiment_id: str) -> ExperimentV1:
        revisions = self._revision_ids(experiment_id)
        if not revisions:
            raise InvalidInvocationError(f"unknown experiment: {experiment_id!r}")
        return self._ledger.load("experiments", revisions[-1], ExperimentV1)

    def _latest_experiments(self) -> dict[str, ExperimentV1]:
        latest_ids: dict[str, str] = {}
        for record_id in self._ledger.list_ids("experiments"):
            if _REVISION_SEPARATOR not in record_id or not record_id.startswith("experiment:"):
                continue
            base_id = record_id.split(_REVISION_SEPARATOR, 1)[0]
            if base_id not in latest_ids or record_id > latest_ids[base_id]:
                latest_ids[base_id] = record_id
        return {
            base_id: self._ledger.load("experiments", record_id, ExperimentV1)
            for base_id, record_id in sorted(latest_ids.items())
        }

    def _campaign_run_count(self, campaign_id: str, *, exclude: str | None = None) -> int:
        return sum(
            1
            for base_id, experiment in self._latest_experiments().items()
            if experiment.campaign_id == campaign_id
            and base_id != exclude
            and experiment.resource_usage.get("runs", 0.0) > 0
        )

    # -- lifecycle -----------------------------------------------------------

    def propose(
        self,
        campaign_id: str,
        hypothesis: HypothesisV1,
        *,
        permitted_globs: Sequence[str],
        commands: Sequence[Sequence[str]],
        timeout_seconds: int = 600,
        smoke_only: bool = False,
        environment_allowlist: Sequence[str] = (),
    ) -> ExperimentV1:
        """Record a proposed experiment bound to one falsifiable hypothesis."""
        campaign = self._campaigns.require_active(campaign_id)
        if hypothesis.campaign_id != campaign_id:
            raise InvalidInvocationError(
                f"hypothesis {hypothesis.hypothesis_id} belongs to another campaign"
            )
        if not permitted_globs:
            raise InvalidInvocationError(
                "an experiment requires the smallest plausible mutation surface",
                hint="declare at least one permitted glob",
            )
        overlap = frozen_permitted_intersection(permitted_globs, self._frozen_surfaces)
        if overlap:
            pairs = ", ".join(f"{permitted} ~ {frozen}" for permitted, frozen in overlap)
            raise GateFailedError(
                f"permitted globs intersect frozen surfaces: {pairs}",
                hint="narrow the mutation surface or run a separate governance campaign",
            )
        experiment_id = self._ids.new_id("experiment")
        branch = "/".join(
            (
                WORKTREE_BRANCH_PREFIX,
                slugify(campaign_id),
                slugify(experiment_id),
            )
        )
        experiment = ExperimentV1(
            experiment_id=experiment_id,
            campaign_id=campaign_id,
            hypothesis_id=hypothesis.hypothesis_id,
            seam=hypothesis.seam,
            baseline=campaign.baseline,
            fork_event=_UNFORKED_EVENT,
            permitted_globs=list(permitted_globs),
            frozen_surfaces=list(self._frozen_surfaces),
            branch=branch,
            commands=[list(argv) for argv in commands],
            environment=EnvironmentRefV1(
                platform=sys.platform,
                variables_allowlisted=list(environment_allowlist),
            ),
            timeout_seconds=timeout_seconds,
            status=ExperimentStatus.PROPOSED,
            smoke_only=smoke_only,
            created_at=self._clock.now(),
        )
        self._persist(experiment)
        self._emitter.emit(
            "dev.gauntlet.experiment.proposed.v1",
            {
                "experiment_id": experiment_id,
                "campaign_id": campaign_id,
                "hypothesis_id": hypothesis.hypothesis_id,
                "seam": str(hypothesis.seam),
                "smoke_only": smoke_only,
            },
        )
        return experiment

    def fork(self, experiment_id: str, *, fork_event_id: str) -> ExperimentV1:
        """Create the experiment branch + external worktree from the parent.

        ``fork_event_id`` is the graph-layer fork point, supplied by the
        caller through the event/graph seam (this module does not import the
        graph adapter).
        """
        experiment = self.load(experiment_id)
        self._campaigns.require_active(experiment.campaign_id)
        if experiment.fork_event != _UNFORKED_EVENT:
            raise InvalidInvocationError(f"experiment {experiment_id} is already forked")
        if not fork_event_id.strip():
            raise InvalidInvocationError("fork requires the recorded graph fork event id")
        overlap = frozen_permitted_intersection(
            experiment.permitted_globs, experiment.frozen_surfaces
        )
        if overlap:
            pairs = ", ".join(f"{permitted} ~ {frozen}" for permitted, frozen in overlap)
            raise GateFailedError(f"permitted globs intersect frozen surfaces: {pairs}")
        parent_commit = experiment.baseline.commit
        if parent_commit is None:
            raise InvalidInvocationError("campaign baseline has no recorded parent commit")
        self._git.create_branch(experiment.branch, parent_commit)
        workspace_id = slugify(experiment_id)
        record = self._worktrees.create(
            workspace_id,
            branch=experiment.branch,
            parent_commit=parent_commit,
            experiment_id=experiment_id,
            permitted_globs=experiment.permitted_globs,
        )
        manifest_relative = record.tracked_manifest.relative_to(self._paths.git_root).as_posix()
        forked = experiment.model_copy(
            update={
                "fork_event": fork_event_id,
                "worktree_manifest": manifest_relative,
                "updated_at": self._clock.now(),
            }
        )
        self._persist(forked)
        self._emitter.emit(
            "dev.gauntlet.experiment.forked.v1",
            {
                "experiment_id": experiment_id,
                "branch": experiment.branch,
                "parent_commit": parent_commit,
                "fork_event": fork_event_id,
                "workspace_id": workspace_id,
            },
        )
        return forked

    def _candidate_env(
        self, experiment: ExperimentV1, base_env: Mapping[str, str] | None
    ) -> dict[str, str]:
        source: Mapping[str, str] = base_env if base_env is not None else os.environ
        env = {"PATH": source.get("PATH", "")}
        allowlist = experiment.environment.variables_allowlisted if experiment.environment else []
        for key in allowlist:
            if key in source:
                env[key] = source[key]
        # Policy-level network denial: candidates get no proxy/credential
        # variables and this marker; it is not an OS-level sandbox.
        env["GAUNTLET_NETWORK"] = "deny"
        return env

    def run(
        self,
        experiment_id: str,
        *,
        costly: bool = False,
        base_env: Mapping[str, str] | None = None,
    ) -> RunReport:
        """Execute only the declared commands inside the candidate worktree."""
        experiment = self.load(experiment_id)
        campaign = self._campaigns.require_active(experiment.campaign_id)
        if experiment.fork_event == _UNFORKED_EVENT:
            raise InvalidInvocationError(f"experiment {experiment_id} must be forked before run")
        if not experiment.commands:
            raise InvalidInvocationError("experiment declares no commands to run")
        limits = [
            limit
            for limit in (
                campaign.budget.max_experiments,
                campaign.stop_policy.hard_budget.max_experiments,
            )
            if limit is not None
        ]
        already_ran = experiment.resource_usage.get("runs", 0.0) > 0
        if limits and not already_ran:
            used = self._campaign_run_count(experiment.campaign_id, exclude=experiment_id)
            if used >= min(limits):
                raise GateFailedError(
                    f"campaign experiment budget exhausted ({used}/{min(limits)})",
                    hint="stop the campaign or raise the budget through governance",
                )
        if costly:
            self._gate.require_committed(
                "run-costly-experiment",
                action_class=ActionClass.R2,
                detail=f"experiment {experiment_id}",
            )
        workspace_id = slugify(experiment_id)
        worktree = self._worktrees.local_path(workspace_id)
        if not worktree.is_dir():
            raise InvalidInvocationError(f"candidate worktree missing: {worktree}")
        if worktree.resolve() == self._paths.git_root.resolve():
            raise SecurityViolationError(
                "refusing to execute candidate commands in the main worktree"
            )
        running = experiment.model_copy(
            update={"status": ExperimentStatus.RUNNING, "updated_at": self._clock.now()}
        )
        self._persist(running)
        env = self._candidate_env(experiment, base_env)
        executions: list[CommandExecution] = []
        output_bytes = 0
        crashed = False
        for argv in experiment.commands:
            if not argv:
                raise InvalidInvocationError("experiment declares an empty command")
            if any(ch in argv[0] for ch in " \t;&|<>"):
                raise SecurityViolationError(f"unsafe executable name: {argv[0]!r}")
            started_at = self._clock.now()
            completed = self._runner.run(
                list(argv),
                cwd=worktree,
                env=env,
                timeout_seconds=experiment.timeout_seconds,
                max_output_bytes=self._max_output_bytes,
            )
            stdout_bytes = completed.stdout.encode("utf-8")
            stderr_bytes = completed.stderr.encode("utf-8")
            output_bytes += len(stdout_bytes) + len(stderr_bytes)
            executions.append(
                CommandExecution(
                    argv=tuple(argv),
                    cwd=str(worktree),
                    exit_code=completed.exit_code,
                    timed_out=completed.timed_out,
                    stdout_digest=self._blobs.store(stdout_bytes, media_type="text/plain"),
                    stderr_digest=self._blobs.store(stderr_bytes, media_type="text/plain"),
                    started_at=started_at,
                    finished_at=self._clock.now(),
                )
            )
            if completed.exit_code != 0 or completed.timed_out:
                crashed = True
                break
        changed = tuple(sorted(self._git.dirty_paths(cwd=worktree)))
        usage = {
            "runs": experiment.resource_usage.get("runs", 0.0) + 1.0,
            "commands": float(len(executions)),
            "output_bytes": float(output_bytes),
        }
        scope = check_change_scope(
            changed,
            permitted_globs=experiment.permitted_globs,
            frozen_surfaces=experiment.frozen_surfaces,
        )
        if not scope.ok:
            blocked = running.model_copy(
                update={
                    "status": ExperimentStatus.BLOCKED,
                    "status_rationale": (
                        "candidate diff violated its mutation surface; "
                        f"frozen: {list(scope.frozen_violations)}; "
                        f"outside permitted: {list(scope.outside_permitted)}"
                    ),
                    "resource_usage": usage,
                    "updated_at": self._clock.now(),
                }
            )
            self._persist(blocked)
            detail = (
                f"candidate_id={experiment_id} branch={experiment.branch} "
                f"violated_rule=frozen-surface-or-permitted-globs "
                f"frozen={list(scope.frozen_violations)} "
                f"outside_permitted={list(scope.outside_permitted)}"
            )
            self._emitter.emit(
                "dev.gauntlet.counterexample.created.v1",
                {
                    "candidate_id": experiment_id,
                    "branch": experiment.branch,
                    "violated_rule": "frozen-surface-or-permitted-globs",
                    "frozen": list(scope.frozen_violations),
                    "outside_permitted": list(scope.outside_permitted),
                    "severity": "critical",
                },
            )
            raise GateFailedError(
                f"mutation surface violation: {detail}",
                hint="record a security counterexample and repair the candidate",
            )
        candidate_commit: str | None = None
        if changed and not crashed:
            self._git.run(["add", "-A"], cwd=worktree)
            self._git.run(
                ["commit", "-m", f"gauntlet: experiment {experiment_id} candidate"],
                cwd=worktree,
            )
            candidate_commit = self._git.run(["rev-parse", "HEAD"], cwd=worktree).stdout.strip()
        status = ExperimentStatus.CRASH if crashed else ExperimentStatus.RUNNING
        rationale = (
            "declared command failed or timed out"
            if crashed
            else (
                "plumbing smoke check completed"
                if experiment.smoke_only
                else "declared commands completed; awaiting comparison"
            )
        )
        finished = running.model_copy(
            update={
                "status": status,
                "status_rationale": rationale,
                "commits": [*experiment.commits, candidate_commit]
                if candidate_commit
                else experiment.commits,
                "resource_usage": usage,
                "updated_at": self._clock.now(),
            }
        )
        self._persist(finished)
        self._emitter.emit(
            "dev.gauntlet.experiment.completed.v1",
            {
                "experiment_id": experiment_id,
                "status": str(status),
                "commands": len(executions),
                "changed_paths": list(changed),
                "smoke_only": experiment.smoke_only,
            },
        )
        return RunReport(
            experiment=finished,
            executions=tuple(executions),
            changed_paths=changed,
            candidate_commit=candidate_commit,
        )

    # -- comparison and conclusions -------------------------------------------

    def compare(
        self,
        experiment_id: str,
        *,
        baseline_candidate_id: str,
        candidate_id: str,
        baseline_metrics: Mapping[str, Sequence[float]],
        candidate_metrics: Mapping[str, Sequence[float]],
        protected_regressions: Mapping[str, float] | None = None,
        minimum_practical_effect: float | None = None,
        interval_fn: IntervalFn | None = None,
        seed: int | None = None,
    ) -> ComparisonV1:
        """Paired mean deltas; confidence bounds come from ``interval_fn``.

        The statistics module supplies real interval methods later; without
        one, bounds stay ``None`` and the comparison is marked inconclusive
        whenever a minimum practical effect is configured (underpowered
        evidence is never rounded into a decision).
        """
        experiment = self.load(experiment_id)
        if experiment.resource_usage.get("runs", 0.0) <= 0:
            raise InvalidInvocationError("compare requires a completed run")
        if sorted(baseline_metrics) != sorted(candidate_metrics):
            raise InvalidInvocationError("baseline and candidate metric names differ")
        deltas: list[MetricResultV1] = []
        bounds_missing = False
        for metric in sorted(baseline_metrics):
            base_values = list(baseline_metrics[metric])
            cand_values = list(candidate_metrics[metric])
            if not base_values or len(base_values) != len(cand_values):
                raise InvalidInvocationError(
                    f"paired comparison requires equal non-empty samples for {metric!r}"
                )
            delta = sum(cand_values) / len(cand_values) - sum(base_values) / len(base_values)
            lower: float | None = None
            upper: float | None = None
            if interval_fn is not None:
                lower, upper = interval_fn(metric, base_values, cand_values)
            else:
                bounds_missing = True
            deltas.append(
                MetricResultV1(
                    metric=metric,
                    value=delta,
                    n=len(base_values),
                    lower_bound=lower,
                    upper_bound=upper,
                )
            )
        inconclusive = bounds_missing and minimum_practical_effect is not None
        comparison = ComparisonV1(
            comparison_id=self._ids.new_id("comparison"),
            baseline_candidate=baseline_candidate_id,
            candidate=candidate_id,
            paired=True,
            deltas=deltas,
            protected_regressions=dict(protected_regressions or {}),
            inconclusive=inconclusive,
            seed=seed,
            method="paired-mean-delta",
            created_at=self._clock.now(),
        )
        self._ledger.append("experiments", comparison.comparison_id, comparison)
        updated = experiment.model_copy(
            update={"comparison_ref": comparison.comparison_id, "updated_at": self._clock.now()}
        )
        self._persist(updated)
        return comparison

    def _require_hypothesis_conclusion_allowed(self, experiment: ExperimentV1) -> None:
        if experiment.smoke_only:
            raise GateFailedError(
                f"experiment {experiment.experiment_id} is a smoke/plumbing run; "
                "it can never conclude a hypothesis as keep or discard",
                hint="record it as a plumbing check (inconclusive) instead",
            )

    def _conclude(
        self, experiment_id: str, status: ExperimentStatus, rationale: str
    ) -> ExperimentV1:
        if not rationale.strip():
            raise InvalidInvocationError(f"{status} requires a rationale")
        experiment = self.load(experiment_id)
        concluded = experiment.model_copy(
            update={
                "status": status,
                "status_rationale": rationale,
                "updated_at": self._clock.now(),
            }
        )
        self._persist(concluded)
        self._emitter.emit(
            "dev.gauntlet.experiment.completed.v1",
            {"experiment_id": experiment_id, "status": str(status), "rationale": rationale},
        )
        return concluded

    def keep(self, experiment_id: str, *, rationale: str) -> ExperimentV1:
        """Retain the candidate for held-out confirmation. Never auto-promote."""
        experiment = self.load(experiment_id)
        self._require_hypothesis_conclusion_allowed(experiment)
        if experiment.comparison_ref is None:
            raise InvalidInvocationError("keep requires a recorded comparison")
        return self._conclude(experiment_id, ExperimentStatus.KEEP, rationale)

    def discard(
        self, experiment_id: str, *, rationale: str, evidence: Sequence[str] = ()
    ) -> ExperimentV1:
        """Discard the hypothesis; the branch, logs, and evidence remain."""
        experiment = self.load(experiment_id)
        self._require_hypothesis_conclusion_allowed(experiment)
        if not rationale.strip():
            raise InvalidInvocationError("discard requires a rationale")
        updated = experiment.model_copy(
            update={"observation_refs": [*experiment.observation_refs, *evidence]}
        )
        self._persist(updated)
        return self._conclude(experiment_id, ExperimentStatus.DISCARD, rationale)

    def mark_crash(self, experiment_id: str, *, rationale: str) -> ExperimentV1:
        return self._conclude(experiment_id, ExperimentStatus.CRASH, rationale)

    def mark_inconclusive(self, experiment_id: str, *, rationale: str) -> ExperimentV1:
        return self._conclude(experiment_id, ExperimentStatus.INCONCLUSIVE, rationale)

    # -- archive and repair distillation ---------------------------------------

    def archive(self, campaign_id: str, entries: Sequence[ArchiveEntry]) -> Path:
        """Append a deterministic quality-diversity/Pareto archive record."""
        front = non_dominated(entries)
        front_ids = {entry.experiment_id for entry in front}
        payload = {
            "schema_version": "dev.gauntlet.qd-archive/v1",
            "campaign_id": campaign_id,
            "entries": [
                {
                    "experiment_id": entry.experiment_id,
                    "behavior": dict(sorted(entry.behavior.items())),
                    "metrics": dict(sorted(entry.metrics.items())),
                    "non_dominated": entry.experiment_id in front_ids,
                }
                for entry in sorted(entries, key=lambda entry: entry.experiment_id)
            ],
            "pareto_front": [entry.experiment_id for entry in front],
            "created_at": self._clock.now(),
        }
        archive_id = self._ids.new_id("archive")
        target = self._ledger.kind_dir("experiments") / f"{archive_id.replace(':', '__')}.json"
        atomic_write(target, canonical_bytes(payload))
        self._emitter.emit(
            "dev.gauntlet.experiment.completed.v1",
            {"archive_id": archive_id, "campaign_id": campaign_id, "kind": "qd-archive"},
        )
        return target

    def propose_repair_distillation(
        self,
        prior_experiments: Sequence[ExperimentV1],
        *,
        repair_pattern: str,
        min_recurrence: int = 3,
    ) -> dict[str, object] | None:
        """Advisory operator-distillation proposal when a repair recurs.

        When the same seam + repair pattern has succeeded repeatedly, the
        escalation ladder says the repair should stop living as prose and
        become a validated deterministic operator. The returned record is
        advisory only; it never mutates policy or spec state.
        """
        kept = [
            experiment
            for experiment in prior_experiments
            if experiment.status is ExperimentStatus.KEEP
        ]
        by_seam: dict[str, list[ExperimentV1]] = {}
        for experiment in kept:
            by_seam.setdefault(str(experiment.seam), []).append(experiment)
        recurring = {
            seam: experiments
            for seam, experiments in by_seam.items()
            if len(experiments) >= min_recurrence
        }
        if not recurring:
            return None
        seam, experiments = sorted(recurring.items())[0]
        proposal: dict[str, object] = {
            "kind": "operator-distillation-proposal",
            "advisory_only": True,
            "seam": seam,
            "repair_pattern": repair_pattern,
            "occurrences": len(experiments),
            "experiment_ids": sorted(e.experiment_id for e in experiments),
            "escalation_stage": "repeatedly-validated-deterministic-operator",
            "next_stage": "workflow-or-harness-change",
            "created_at": self._clock.now(),
        }
        self._emitter.emit("dev.gauntlet.experiment.completed.v1", proposal)
        return proposal
