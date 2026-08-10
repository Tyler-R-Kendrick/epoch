"""The promotion kernel: plan, lexicographic fail-closed decide, apply.

FROZEN SURFACE. This module is listed in ``DEFAULT_FROZEN_SURFACES``;
changing it requires an R4 ``change-promotion-kernel`` governance intent.

Decision semantics (in this exact order, each gate a ``GateCheckV1``):

 1. exact candidate + environment identity verified;
 2. all hard invariants pass;
 3. evidence/provenance floor complete;
 4. no unresolved critical counterexample;
 5. every protected dimension within its non-regression budget (upper CI);
 6. target dimension exceeds the minimum practical effect (lower CI);
 7. integration and sealed held-out sentinels pass;
 8. evaluator leakage and self-modification checks pass;
 9. ActiveGraph and Git promotion plans are conflict-free;
10. required approval/quorum satisfied.

The first hard failure rejects; missing or uncertain evidence is
inconclusive. There is structurally no weighted-average path: no gate
produces a score, no gate consumes another gate's magnitude, and a
correctness/security/governance failure can never be compensated.

Isolation note: leakage auditing here is process discipline. When the
candidate builder, evaluators, and sealed promotion cases all run under the
same unrestricted OS user, nothing in this module provides cryptographic
secrecy; the stronger isolation mode uses separate CI/runner credentials
and storage for the sealed suite.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Literal, Protocol

from gauntlet.errors import (
    ConflictError,
    GateFailedError,
    InconclusiveError,
    InvalidInvocationError,
    OutcomeUnknownError,
    SecurityViolationError,
)
from gauntlet.models import (
    CandidateV1,
    DatasetManifestV1,
    EvaluationResultV1,
    EvidenceRefV1,
    GateCheckV1,
    MetricResultV1,
    PromotionDecisionV1,
    PromotionPlanV1,
)
from gauntlet.statistics import protected_regression_violations, target_effect_established
from gauntlet.support import Clock, IdGenerator

GATE_ORDER: tuple[str, ...] = (
    "exact-identity",
    "hard-invariants",
    "evidence-floor",
    "critical-counterexamples",
    "protected-budgets",
    "target-effect",
    "integration-sentinels",
    "leakage-and-self-modification",
    "conflict-free-plans",
    "approval-quorum",
)

_IDENTITY_KEYS: tuple[str, ...] = (
    "candidate-commit-identity",
    "environment-identity",
    "spec-digest-match",
    "evaluator-digests-frozen",
)

_GateStatus = Literal["pass", "fail", "inconclusive"]


# ---------------------------------------------------------------------------
# Injected provider protocols (real implementations live in other modules)
# ---------------------------------------------------------------------------


class GraphPromotionProvider(Protocol):
    """ActiveGraph dry-run promotion: (conflicts, plan payload)."""

    def dry_run_promote(self) -> tuple[list[str], dict[str, Any]]: ...


class GitPlanProvider(Protocol):
    """Git three-way applicability: (applicable, conflicts)."""

    def three_way_applicable(self, commit: str) -> tuple[bool, list[str]]: ...


class FrozenSurfaceAuditor(Protocol):
    """Diff of the candidate against declared frozen surfaces."""

    def violations(self, commit: str) -> list[str]: ...


class IntegrationCommitResolver(Protocol):
    """Resolves the exact integration commit the final evaluation ran on."""

    def integration_commit(self, candidate_commit: str) -> str | None: ...


class WorktreeInspector(Protocol):
    """Read-only view of the candidate's observable surfaces for leakage."""

    def worktree_files(self) -> Sequence[str]: ...

    def environment(self) -> Mapping[str, str]: ...

    def argv_history(self) -> Sequence[Sequence[str]]: ...

    def trace_text(self) -> str: ...


@dataclass(frozen=True)
class SettlementStep:
    """One ordered step of the promotion settlement saga."""

    step_id: str
    kind: Literal["git-promotion-branch-update", "graph-promotion", "ledger-decision-record"]
    payload: Mapping[str, Any]


@dataclass(frozen=True)
class SettlementReport:
    """Outcome of running the settlement saga; no cross-store atomicity."""

    status: Literal["completed", "conflict", "outcome_unknown"]
    completed_step_ids: tuple[str, ...]
    failed_step_id: str | None = None
    event_ids: tuple[str, ...] = ()
    detail: str | None = None


class SettlementSaga(Protocol):
    """Fail-closed saga executor (built by the effects engineer)."""

    def run(self, steps: Sequence[SettlementStep]) -> SettlementReport: ...


# ---------------------------------------------------------------------------
# Evidence bundle consumed by decide()
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PromotionEvidence:
    """Everything decide() may look at. ``None`` means evidence is missing.

    There is deliberately no aggregate score field: the kernel cannot be
    handed a weighted average.
    """

    hard_invariant_results: Sequence[EvaluationResultV1]
    evidence_floor_required: Sequence[str]
    evidence_present: Sequence[EvidenceRefV1]
    unresolved_critical_counterexamples: Sequence[str]
    protected_deltas: Mapping[str, MetricResultV1]
    protected_budgets: Mapping[str, float]
    target_delta: MetricResultV1 | None
    minimum_practical_effect: float | None
    integration_passed: bool | None
    sealed_sentinels_passed: bool | None
    leakage_violations: Sequence[str] | None
    self_modification_violations: Sequence[str] | None
    approvals_satisfied: bool | None
    approvals_missing: Sequence[str] = ()


# ---------------------------------------------------------------------------
# Kernel
# ---------------------------------------------------------------------------


class PromotionKernel:
    """Assembles plans and makes the lexicographic fail-closed decision."""

    def __init__(
        self,
        *,
        clock: Clock,
        ids: IdGenerator,
        graph: GraphPromotionProvider,
        git: GitPlanProvider,
        frozen_surfaces: FrozenSurfaceAuditor,
        integration: IntegrationCommitResolver,
    ) -> None:
        self._clock = clock
        self._ids = ids
        self._graph = graph
        self._git = git
        self._frozen_surfaces = frozen_surfaces
        self._integration = integration

    # -- plan ---------------------------------------------------------------

    def plan(
        self,
        *,
        campaign_id: str,
        candidate: CandidateV1,
        spec_digest_expected: str,
        spec_digest_actual: str,
        evaluator_digests_recorded: Mapping[str, str],
        evaluator_digests_current: Mapping[str, str],
        worktree_head_commit: str | None,
        environment_digest_expected: str | None = None,
    ) -> PromotionPlanV1:
        """Dry-run everything; the plan records facts, it decides nothing."""
        graph_conflicts, graph_plan = self._graph.dry_run_promote()
        git_applicable, git_conflicts = self._git.three_way_applicable(candidate.commit)
        frozen_violations = self._frozen_surfaces.violations(candidate.commit)
        integrity: dict[str, bool] = {
            "spec-digest-match": spec_digest_expected == spec_digest_actual,
            "evaluator-digests-frozen": dict(evaluator_digests_recorded)
            == dict(evaluator_digests_current),
        }
        if worktree_head_commit is not None:
            integrity["candidate-commit-identity"] = worktree_head_commit == candidate.commit
        if environment_digest_expected is not None:
            actual_env = (
                candidate.environment.environment_digest
                if candidate.environment is not None
                else None
            )
            integrity["environment-identity"] = actual_env == environment_digest_expected
        return PromotionPlanV1(
            plan_id=self._ids.new_id("promotion-plan"),
            campaign_id=campaign_id,
            candidate_id=candidate.candidate_id,
            candidate_commit=candidate.commit,
            graph_plan=graph_plan,
            graph_conflicts=graph_conflicts,
            git_applicable=git_applicable,
            git_conflicts=git_conflicts,
            frozen_surface_violations=frozen_violations,
            integration_commit=self._integration.integration_commit(candidate.commit),
            integrity_checks=integrity,
            created_at=self._clock.now(),
        )

    # -- decide -------------------------------------------------------------

    def decide(
        self,
        plan: PromotionPlanV1,
        candidate: CandidateV1,
        evidence: PromotionEvidence,
    ) -> PromotionDecisionV1:
        """Lexicographic fail-closed acceptance bound to the tested commit."""
        if candidate.candidate_id != plan.candidate_id or candidate.commit != (
            plan.candidate_commit
        ):
            raise SecurityViolationError(
                "decision candidate does not match the plan's tested candidate: "
                f"plan binds {plan.candidate_id}@{plan.candidate_commit}, "
                f"got {candidate.candidate_id}@{candidate.commit}",
                hint="promotion decisions bind the exact tested commit; re-plan for a new commit",
            )
        checks: list[GateCheckV1] = []
        outcome: Literal["accepted", "rejected", "inconclusive"] = "accepted"
        for gate_name in GATE_ORDER:
            status, detail = self._evaluate_gate(gate_name, plan, evidence)
            checks.append(GateCheckV1(gate=gate_name, passed=status == "pass", detail=detail))
            if status == "fail":
                outcome = "rejected"
                break
            if status == "inconclusive":
                outcome = "inconclusive"
                break
        return PromotionDecisionV1(
            decision_id=self._ids.new_id("promotion-decision"),
            plan_id=plan.plan_id,
            campaign_id=plan.campaign_id,
            candidate_id=plan.candidate_id,
            candidate_commit=plan.candidate_commit,
            artifact_digests=list(candidate.artifact_digests),
            outcome=outcome,
            gates=checks,
            decided_at=self._clock.now(),
        )

    def _evaluate_gate(
        self,
        gate_name: str,
        plan: PromotionPlanV1,
        evidence: PromotionEvidence,
    ) -> tuple[_GateStatus, str]:
        if gate_name == "exact-identity":
            return self._gate_identity(plan)
        if gate_name == "hard-invariants":
            return self._gate_hard_invariants(evidence)
        if gate_name == "evidence-floor":
            return self._gate_evidence_floor(evidence)
        if gate_name == "critical-counterexamples":
            return self._gate_counterexamples(evidence)
        if gate_name == "protected-budgets":
            return self._gate_protected_budgets(evidence)
        if gate_name == "target-effect":
            return self._gate_target_effect(evidence)
        if gate_name == "integration-sentinels":
            return self._gate_integration_sentinels(evidence)
        if gate_name == "leakage-and-self-modification":
            return self._gate_leakage(evidence)
        if gate_name == "conflict-free-plans":
            return self._gate_conflict_free(plan)
        return self._gate_approvals(evidence)

    @staticmethod
    def _gate_identity(plan: PromotionPlanV1) -> tuple[_GateStatus, str]:
        for key in _IDENTITY_KEYS:
            value = plan.integrity_checks.get(key)
            if value is None:
                return "inconclusive", f"integrity check {key!r} was not performed"
            if not value:
                return "fail", f"integrity check {key!r} failed"
        return "pass", "exact candidate and environment identity verified"

    @staticmethod
    def _gate_hard_invariants(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        if not evidence.hard_invariant_results:
            return "inconclusive", "no hard-invariant evaluations were recorded"
        for result in evidence.hard_invariant_results:
            if result.passed is None or result.abstained:
                return "inconclusive", f"hard invariant {result.evaluator_id!r} did not conclude"
            if not result.passed:
                return "fail", f"hard invariant {result.evaluator_id!r} failed"
        return "pass", "all hard invariants passed"

    @staticmethod
    def _gate_evidence_floor(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        present: set[str] = set()
        for ref in evidence.evidence_present:
            present.add(ref.kind)
            present.add(ref.ref_id)
        missing = sorted(set(evidence.evidence_floor_required) - present)
        if missing:
            return "fail", "evidence floor incomplete: missing " + ", ".join(missing)
        return "pass", "evidence and provenance floor complete"

    @staticmethod
    def _gate_counterexamples(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        if evidence.unresolved_critical_counterexamples:
            return (
                "fail",
                "unresolved critical counterexamples: "
                + ", ".join(sorted(evidence.unresolved_critical_counterexamples)),
            )
        return "pass", "no unresolved critical counterexample"

    @staticmethod
    def _gate_protected_budgets(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        try:
            violations = protected_regression_violations(
                evidence.protected_deltas, evidence.protected_budgets
            )
        except InconclusiveError as error:
            return "inconclusive", error.message
        if violations:
            return "fail", "; ".join(violations)
        return "pass", "every protected dimension is within its non-regression budget"

    @staticmethod
    def _gate_target_effect(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        try:
            established = target_effect_established(
                evidence.target_delta, evidence.minimum_practical_effect
            )
        except InconclusiveError as error:
            return "inconclusive", error.message
        if not established:
            return "fail", "target effect confidently below the minimum practical effect"
        return "pass", "target lower confidence bound exceeds the minimum practical effect"

    @staticmethod
    def _gate_integration_sentinels(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        if evidence.integration_passed is None or evidence.sealed_sentinels_passed is None:
            return "inconclusive", "integration or sealed sentinel results are missing"
        if not evidence.integration_passed:
            return "fail", "exact-integration-commit evaluation failed"
        if not evidence.sealed_sentinels_passed:
            return "fail", "sealed held-out sentinels failed"
        return "pass", "integration and sealed held-out sentinels passed"

    @staticmethod
    def _gate_leakage(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        if evidence.leakage_violations is None or (
            evidence.self_modification_violations is None
        ):
            return "inconclusive", "leakage or self-modification audit was not run"
        if evidence.leakage_violations:
            return "fail", "leakage detected: " + "; ".join(evidence.leakage_violations)
        if evidence.self_modification_violations:
            return (
                "fail",
                "candidate modified its own evaluators: "
                + "; ".join(evidence.self_modification_violations),
            )
        return "pass", "no leakage and no candidate-modified evaluator"

    @staticmethod
    def _gate_conflict_free(plan: PromotionPlanV1) -> tuple[_GateStatus, str]:
        if plan.graph_conflicts:
            return "fail", "ActiveGraph promotion conflicts: " + "; ".join(plan.graph_conflicts)
        if not plan.git_applicable or plan.git_conflicts:
            return "fail", "Git plan not conflict-free: " + (
                "; ".join(plan.git_conflicts) or "three-way merge not applicable"
            )
        if plan.frozen_surface_violations:
            return (
                "fail",
                "frozen surfaces touched: " + "; ".join(plan.frozen_surface_violations),
            )
        return "pass", "ActiveGraph and Git promotion plans are conflict-free"

    @staticmethod
    def _gate_approvals(evidence: PromotionEvidence) -> tuple[_GateStatus, str]:
        if evidence.approvals_satisfied is None:
            return "inconclusive", "approval/quorum state was not collected"
        if not evidence.approvals_satisfied:
            return "fail", "required approvals missing: " + ", ".join(
                sorted(evidence.approvals_missing)
            )
        return "pass", "required approval/quorum satisfied"

    # -- apply / rollback -----------------------------------------------------

    def assemble_settlement_steps(
        self,
        decision: PromotionDecisionV1,
        plan: PromotionPlanV1,
    ) -> tuple[SettlementStep, ...]:
        """Ordered settlement: Git branch, then graph, then ledger record."""
        return (
            SettlementStep(
                step_id="git-promotion-branch-update",
                kind="git-promotion-branch-update",
                payload={
                    "candidate_commit": decision.candidate_commit,
                    "integration_commit": plan.integration_commit,
                },
            ),
            SettlementStep(
                step_id="graph-promotion",
                kind="graph-promotion",
                payload={"graph_plan": dict(plan.graph_plan)},
            ),
            SettlementStep(
                step_id="ledger-decision-record",
                kind="ledger-decision-record",
                payload={"decision_id": decision.decision_id},
            ),
        )

    def apply(
        self,
        decision: PromotionDecisionV1,
        plan: PromotionPlanV1,
        saga: SettlementSaga,
    ) -> SettlementReport:
        """Run the fail-closed settlement saga for an accepted decision."""
        if decision.outcome != "accepted":
            raise GateFailedError(
                f"cannot apply a {decision.outcome!r} promotion decision",
                hint="only an accepted decision settles; re-run evaluate/promote plan",
            )
        if decision.plan_id != plan.plan_id or decision.candidate_commit != (
            plan.candidate_commit
        ):
            raise SecurityViolationError(
                "decision and plan do not bind the same tested candidate commit"
            )
        report = saga.run(self.assemble_settlement_steps(decision, plan))
        if report.status == "conflict":
            raise ConflictError(
                f"promotion settlement conflicted at step {report.failed_step_id!r}: "
                f"{report.detail or 'no detail'}"
            )
        if report.status == "outcome_unknown":
            raise OutcomeUnknownError(
                f"promotion settlement outcome unknown at step {report.failed_step_id!r}",
                hint="run `gauntlet promote status` and reconcile before retrying",
            )
        return report

    def rollback(
        self,
        decision: PromotionDecisionV1,
        *,
        reason: str,
    ) -> PromotionDecisionV1:
        """A NEW compensating decision record; history is never rewritten."""
        if decision.outcome != "accepted":
            raise InvalidInvocationError(
                f"only an accepted promotion can be rolled back, got {decision.outcome!r}"
            )
        return PromotionDecisionV1(
            decision_id=self._ids.new_id("promotion-decision"),
            plan_id=decision.plan_id,
            campaign_id=decision.campaign_id,
            candidate_id=decision.candidate_id,
            candidate_commit=decision.candidate_commit,
            artifact_digests=list(decision.artifact_digests),
            outcome="rejected",
            gates=[
                GateCheckV1(gate="rollback-compensation", passed=False, detail=reason),
            ],
            evidence=[EvidenceRefV1(kind="event", ref_id=decision.decision_id)],
            decided_at=self._clock.now(),
        )


# ---------------------------------------------------------------------------
# Leakage audits
# ---------------------------------------------------------------------------


def audit_split_disjointness(manifests: Sequence[DatasetManifestV1]) -> list[str]:
    """Case-digest intersection across split manifests must be empty."""
    violations: list[str] = []
    for index, first in enumerate(manifests):
        first_digests = {case.digest.value for case in first.cases}
        for second in manifests[index + 1 :]:
            second_digests = {case.digest.value for case in second.cases}
            for shared in sorted(first_digests & second_digests):
                violations.append(
                    f"case sha256:{shared} appears in both "
                    f"{first.split.value}:{first.dataset_id} and "
                    f"{second.split.value}:{second.dataset_id}"
                )
    return violations


def audit_candidate_leakage(
    inspector: WorktreeInspector,
    sealed: DatasetManifestV1,
) -> list[str]:
    """Scan candidate-observable surfaces for sealed promotion-case markers.

    Surfaces: worktree file list, environment variables, command-line
    arguments, and trace/log text. This is process discipline under a single
    OS user, not cryptographic secrecy; see the module docstring.
    """
    env_text = "\n".join(f"{key}={value}" for key, value in inspector.environment().items())
    argv_text = "\n".join(" ".join(argv) for argv in inspector.argv_history())
    surfaces: tuple[tuple[str, str], ...] = (
        ("worktree-files", "\n".join(inspector.worktree_files())),
        ("environment", env_text),
        ("argv", argv_text),
        ("trace", inspector.trace_text()),
    )
    violations: list[str] = []
    for surface_name, text in surfaces:
        for case in sealed.cases:
            if case.digest.value in text or case.case_id in text:
                violations.append(
                    f"{surface_name} exposes sealed promotion case {case.case_id}"
                )
    return violations


def require_no_leakage(
    inspector: WorktreeInspector,
    sealed: DatasetManifestV1,
    split_manifests: Sequence[DatasetManifestV1],
) -> None:
    """Raise ``SecurityViolationError`` on any leakage or split overlap."""
    violations = audit_split_disjointness(split_manifests)
    violations.extend(audit_candidate_leakage(inspector, sealed))
    if violations:
        raise SecurityViolationError(
            "promotion leakage audit failed:\n" + "\n".join(violations),
            hint="sealed promotion cases must never be visible to candidate builders",
        )
