"""Promotion kernel: gate order, fail-closed decisions, settlement, leakage."""

from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from typing import Any

import pytest

from gauntlet.constants import SplitKind
from gauntlet.errors import (
    ConflictError,
    GateFailedError,
    InvalidInvocationError,
    OutcomeUnknownError,
    SecurityViolationError,
)
from gauntlet.models import (
    CandidateV1,
    DatasetCaseV1,
    DatasetManifestV1,
    DigestRefV1,
    EnvironmentRefV1,
    EvaluationResultV1,
    EvidenceRefV1,
    MetricResultV1,
    PromotionPlanV1,
)
from gauntlet.promotion import (
    GATE_ORDER,
    PromotionEvidence,
    PromotionKernel,
    SettlementReport,
    SettlementStep,
    audit_candidate_leakage,
    audit_split_disjointness,
    require_no_leakage,
)
from gauntlet.support import FrozenClock, SequentialIdGenerator

COMMIT = "a" * 40
OTHER_COMMIT = "b" * 40
SPEC_DIGEST = "sha256:" + "1" * 64
ENV_DIGEST = "sha256:" + "2" * 64


def hex_of(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Fakes for the injected provider protocols
# ---------------------------------------------------------------------------


@dataclass
class FakeGraph:
    conflicts: list[str] = field(default_factory=list)
    plan: dict[str, Any] = field(default_factory=lambda: {"events": 3})

    def dry_run_promote(self) -> tuple[list[str], dict[str, Any]]:
        return list(self.conflicts), dict(self.plan)


@dataclass
class FakeGit:
    applicable: bool = True
    conflicts: list[str] = field(default_factory=list)

    def three_way_applicable(self, commit: str) -> tuple[bool, list[str]]:
        return self.applicable, list(self.conflicts)


@dataclass
class FakeFrozenSurfaces:
    violations_list: list[str] = field(default_factory=list)

    def violations(self, commit: str) -> list[str]:
        return list(self.violations_list)


@dataclass
class FakeIntegration:
    commit: str | None = "c" * 40

    def integration_commit(self, candidate_commit: str) -> str | None:
        return self.commit


@dataclass
class FakeSaga:
    report: SettlementReport
    seen_steps: list[SettlementStep] = field(default_factory=list)

    def run(self, steps: Sequence[SettlementStep]) -> SettlementReport:
        self.seen_steps = list(steps)
        return self.report


@dataclass
class FakeInspector:
    files: list[str] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)
    argvs: list[list[str]] = field(default_factory=list)
    trace: str = ""

    def worktree_files(self) -> Sequence[str]:
        return self.files

    def environment(self) -> Mapping[str, str]:
        return self.env

    def argv_history(self) -> Sequence[Sequence[str]]:
        return self.argvs

    def trace_text(self) -> str:
        return self.trace


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


@pytest.fixture()
def kernel(clock: FrozenClock, ids: SequentialIdGenerator) -> PromotionKernel:
    return PromotionKernel(
        clock=clock,
        ids=ids,
        graph=FakeGraph(),
        git=FakeGit(),
        frozen_surfaces=FakeFrozenSurfaces(),
        integration=FakeIntegration(),
    )


def make_kernel(
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    *,
    graph: FakeGraph | None = None,
    git: FakeGit | None = None,
    frozen: FakeFrozenSurfaces | None = None,
    integration: FakeIntegration | None = None,
) -> PromotionKernel:
    return PromotionKernel(
        clock=clock,
        ids=ids,
        graph=graph or FakeGraph(),
        git=git or FakeGit(),
        frozen_surfaces=frozen or FakeFrozenSurfaces(),
        integration=integration or FakeIntegration(),
    )


def make_candidate(
    clock: FrozenClock, *, commit: str = COMMIT, with_env: bool = True
) -> CandidateV1:
    return CandidateV1(
        candidate_id="candidate:001",
        experiment_id="experiment:001",
        branch="gauntlet/exp-001",
        commit=commit,
        artifact_digests=[DigestRefV1(value=hex_of("artifact"))],
        environment=(
            EnvironmentRefV1(platform="linux", environment_digest=ENV_DIGEST)
            if with_env
            else None
        ),
        created_at=clock.now(),
    )


def make_plan(
    kernel: PromotionKernel,
    candidate: CandidateV1,
    **overrides: Any,
) -> PromotionPlanV1:
    arguments: dict[str, Any] = {
        "campaign_id": "campaign:001",
        "candidate": candidate,
        "spec_digest_expected": SPEC_DIGEST,
        "spec_digest_actual": SPEC_DIGEST,
        "evaluator_digests_recorded": {"evaluator:hard": "sha256:aa"},
        "evaluator_digests_current": {"evaluator:hard": "sha256:aa"},
        "worktree_head_commit": candidate.commit,
        "environment_digest_expected": ENV_DIGEST,
    }
    arguments.update(overrides)
    return kernel.plan(**arguments)


def hard_result(
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    *,
    passed: bool | None = True,
    abstained: bool = False,
) -> EvaluationResultV1:
    return EvaluationResultV1(
        evaluation_id=ids.new_id("evaluation"),
        evaluator_id="evaluator:hard",
        evaluator_version="0.1.0",
        candidate_id="candidate:001",
        split=SplitKind.PROMOTION,
        passed=passed,
        abstained=abstained,
        started_at=clock.now(),
    )


def target(lower: float, upper: float) -> MetricResultV1:
    return MetricResultV1(
        metric="success-rate-delta",
        value=(lower + upper) / 2,
        lower_bound=lower,
        upper_bound=upper,
        confidence_level=0.95,
    )


def good_evidence(clock: FrozenClock, ids: SequentialIdGenerator) -> PromotionEvidence:
    return PromotionEvidence(
        hard_invariant_results=[hard_result(clock, ids)],
        evidence_floor_required=["evaluation", "trace"],
        evidence_present=[
            EvidenceRefV1(kind="evaluation", ref_id="evaluation:000001"),
            EvidenceRefV1(kind="trace", ref_id="trace:000001"),
        ],
        unresolved_critical_counterexamples=[],
        protected_deltas={"latency-p95": target(-0.02, 0.03)},
        protected_budgets={"latency-p95": 0.10},
        target_delta=target(0.15, 0.45),
        minimum_practical_effect=0.1,
        integration_passed=True,
        sealed_sentinels_passed=True,
        leakage_violations=[],
        self_modification_violations=[],
        approvals_satisfied=True,
    )


def sealed_dataset() -> DatasetManifestV1:
    return DatasetManifestV1(
        dataset_id="dataset:promotion",
        split=SplitKind.PROMOTION,
        sealed=True,
        cases=[
            DatasetCaseV1(case_id="case:promo-1", digest=DigestRefV1(value=hex_of("promo-1"))),
            DatasetCaseV1(case_id="case:promo-2", digest=DigestRefV1(value=hex_of("promo-2"))),
        ],
    )


# ---------------------------------------------------------------------------
# plan()
# ---------------------------------------------------------------------------


class TestPlan:
    def test_plan_records_all_dry_run_facts(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        assert plan.candidate_commit == COMMIT
        assert plan.git_applicable is True
        assert plan.graph_plan == {"events": 3}
        assert plan.integration_commit == "c" * 40
        assert plan.integrity_checks == {
            "spec-digest-match": True,
            "evaluator-digests-frozen": True,
            "candidate-commit-identity": True,
            "environment-identity": True,
        }

    def test_plan_flags_spec_and_evaluator_digest_drift(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        plan = make_plan(
            kernel,
            make_candidate(clock),
            spec_digest_actual="sha256:" + "9" * 64,
            evaluator_digests_current={"evaluator:hard": "sha256:bb"},
        )
        assert plan.integrity_checks["spec-digest-match"] is False
        assert plan.integrity_checks["evaluator-digests-frozen"] is False

    def test_plan_flags_commit_mismatch(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        plan = make_plan(kernel, make_candidate(clock), worktree_head_commit=OTHER_COMMIT)
        assert plan.integrity_checks["candidate-commit-identity"] is False

    def test_plan_omits_unperformed_checks(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        plan = make_plan(
            kernel,
            make_candidate(clock),
            worktree_head_commit=None,
            environment_digest_expected=None,
        )
        assert "candidate-commit-identity" not in plan.integrity_checks
        assert "environment-identity" not in plan.integrity_checks

    def test_plan_flags_missing_candidate_environment(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        plan = make_plan(kernel, make_candidate(clock, with_env=False))
        assert plan.integrity_checks["environment-identity"] is False

    def test_plan_flags_environment_digest_mismatch(
        self, kernel: PromotionKernel, clock: FrozenClock
    ) -> None:
        plan = make_plan(
            kernel,
            make_candidate(clock),
            environment_digest_expected="sha256:" + "3" * 64,
        )
        assert plan.integrity_checks["environment-identity"] is False


# ---------------------------------------------------------------------------
# decide(): binding and the full lexicographic gate order
# ---------------------------------------------------------------------------


class TestDecisionBinding:
    def test_clean_promotion_is_accepted_with_all_ten_gates(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        decision = kernel.decide(plan, candidate, good_evidence(clock, ids))
        assert decision.outcome == "accepted"
        assert [gate.gate for gate in decision.gates] == list(GATE_ORDER)
        assert all(gate.passed for gate in decision.gates)
        assert decision.candidate_commit == COMMIT
        assert decision.artifact_digests == list(candidate.artifact_digests)

    def test_substituted_commit_is_a_security_violation(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        substituted = replace_commit(candidate, OTHER_COMMIT)
        with pytest.raises(SecurityViolationError, match="does not match the plan"):
            kernel.decide(plan, substituted, good_evidence(clock, ids))

    def test_substituted_candidate_id_is_a_security_violation(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        other = candidate.model_copy(update={"candidate_id": "candidate:999"})
        with pytest.raises(SecurityViolationError):
            kernel.decide(plan, other, good_evidence(clock, ids))


def replace_commit(candidate: CandidateV1, commit: str) -> CandidateV1:
    return candidate.model_copy(update={"commit": commit})


def decide_with(
    kernel: PromotionKernel,
    clock: FrozenClock,
    ids: SequentialIdGenerator,
    evidence: PromotionEvidence,
    plan: PromotionPlanV1 | None = None,
    candidate: CandidateV1 | None = None,
) -> Any:
    candidate = candidate or make_candidate(clock)
    plan = plan or make_plan(kernel, candidate)
    return kernel.decide(plan, candidate, evidence)


class TestGateOrderFirstFailureWins:
    """Each scenario makes exactly one gate the first to fail and asserts
    the decision short-circuits there with the ordered GateCheckV1 list."""

    def assert_stopped_at(self, decision: Any, gate_name: str, outcome: str) -> None:
        assert decision.outcome == outcome
        index = GATE_ORDER.index(gate_name)
        assert [gate.gate for gate in decision.gates] == list(GATE_ORDER[: index + 1])
        assert decision.gates[-1].passed is False
        assert all(gate.passed for gate in decision.gates[:-1])

    def test_gate_1_identity_failure(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate, spec_digest_actual="sha256:" + "9" * 64)
        decision = kernel.decide(plan, candidate, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "exact-identity", "rejected")

    def test_gate_1_missing_identity_check_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate, worktree_head_commit=None)
        decision = kernel.decide(plan, candidate, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "exact-identity", "inconclusive")

    def test_gate_2_hard_invariant_failure(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            hard_invariant_results=[hard_result(clock, ids, passed=False)],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "hard-invariants", "rejected")
        assert "evaluator:hard" in (decision.gates[-1].detail or "")

    def test_gate_2_missing_hard_invariants_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), hard_invariant_results=[])
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "hard-invariants", "inconclusive")

    def test_gate_2_abstaining_hard_invariant_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            hard_invariant_results=[hard_result(clock, ids, passed=None, abstained=True)],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "hard-invariants", "inconclusive")

    def test_gate_3_evidence_floor_incomplete(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), evidence_present=[])
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "evidence-floor", "rejected")
        assert "trace" in (decision.gates[-1].detail or "")

    def test_gate_4_unresolved_critical_counterexample(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            unresolved_critical_counterexamples=["counterexample:001"],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "critical-counterexamples", "rejected")

    def test_gate_5_protected_regression_rejects_an_aggregate_win(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        # Target improves hugely; one protected dimension regresses past
        # budget. No weighted average may compensate: rejected at gate 5.
        evidence = replace(
            good_evidence(clock, ids),
            target_delta=target(4.0, 6.0),
            protected_deltas={"latency-p95": target(0.3, 0.9)},
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "protected-budgets", "rejected")
        assert "latency-p95" in (decision.gates[-1].detail or "")

    def test_gate_5_missing_protected_measurement_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), protected_deltas={})
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "protected-budgets", "inconclusive")

    def test_gate_6_underpowered_positive_estimate_is_inconclusive_not_promoted(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        # Positive point estimate (+0.12) but the CI straddles the floor.
        evidence = replace(good_evidence(clock, ids), target_delta=target(0.04, 0.20))
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "target-effect", "inconclusive")

    def test_gate_6_confidently_absent_target_rejects(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), target_delta=target(0.01, 0.09))
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "target-effect", "rejected")

    def test_gate_7_integration_failure(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), integration_passed=False)
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "integration-sentinels", "rejected")

    def test_gate_7_sealed_sentinel_failure(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), sealed_sentinels_passed=False)
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "integration-sentinels", "rejected")

    def test_gate_7_missing_sentinel_results_are_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), sealed_sentinels_passed=None)
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "integration-sentinels", "inconclusive")

    def test_gate_8_leakage_rejects(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            leakage_violations=["worktree-files exposes sealed promotion case case:promo-1"],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "leakage-and-self-modification", "rejected")

    def test_gate_8_candidate_modified_evaluator_cannot_approve_itself(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            self_modification_violations=[".gauntlet/evaluators/hard.yaml"],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "leakage-and-self-modification", "rejected")
        assert "evaluators" in (decision.gates[-1].detail or "")

    def test_gate_8_unaudited_leakage_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), leakage_violations=None)
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "leakage-and-self-modification", "inconclusive")

    def test_gate_9_graph_conflicts_reject(
        self, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        kernel = make_kernel(clock, ids, graph=FakeGraph(conflicts=["node clash"]))
        decision = decide_with(kernel, clock, ids, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "conflict-free-plans", "rejected")

    def test_gate_9_git_not_applicable_rejects(
        self, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        kernel = make_kernel(clock, ids, git=FakeGit(applicable=False))
        decision = decide_with(kernel, clock, ids, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "conflict-free-plans", "rejected")

    def test_gate_9_git_conflicts_reject(
        self, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        kernel = make_kernel(clock, ids, git=FakeGit(conflicts=["src/app.py"]))
        decision = decide_with(kernel, clock, ids, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "conflict-free-plans", "rejected")

    def test_gate_9_frozen_surface_violation_rejects(
        self, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        kernel = make_kernel(
            clock,
            ids,
            frozen=FakeFrozenSurfaces(violations_list=["scripts/gauntlet/promotion.py"]),
        )
        decision = decide_with(kernel, clock, ids, good_evidence(clock, ids))
        self.assert_stopped_at(decision, "conflict-free-plans", "rejected")

    def test_gate_10_missing_approval_rejects(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(
            good_evidence(clock, ids),
            approvals_satisfied=False,
            approvals_missing=["human-approval"],
        )
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "approval-quorum", "rejected")
        assert "human-approval" in (decision.gates[-1].detail or "")

    def test_gate_10_uncollected_approval_state_is_inconclusive(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        evidence = replace(good_evidence(clock, ids), approvals_satisfied=None)
        decision = decide_with(kernel, clock, ids, evidence)
        self.assert_stopped_at(decision, "approval-quorum", "inconclusive")


# ---------------------------------------------------------------------------
# apply() and rollback()
# ---------------------------------------------------------------------------


def accepted_decision(
    kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
) -> tuple[Any, Any]:
    candidate = make_candidate(clock)
    plan = make_plan(kernel, candidate)
    decision = kernel.decide(plan, candidate, good_evidence(clock, ids))
    assert decision.outcome == "accepted"
    return decision, plan


class TestApply:
    def test_apply_runs_ordered_settlement_steps(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        decision, plan = accepted_decision(kernel, clock, ids)
        saga = FakeSaga(
            SettlementReport(
                status="completed",
                completed_step_ids=(
                    "git-promotion-branch-update",
                    "graph-promotion",
                    "ledger-decision-record",
                ),
                event_ids=("event:1",),
            )
        )
        report = kernel.apply(decision, plan, saga)
        assert report.status == "completed"
        assert [step.kind for step in saga.seen_steps] == [
            "git-promotion-branch-update",
            "graph-promotion",
            "ledger-decision-record",
        ]
        assert saga.seen_steps[0].payload["candidate_commit"] == COMMIT
        assert saga.seen_steps[2].payload["decision_id"] == decision.decision_id

    def test_apply_refuses_non_accepted_decision(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        evidence = replace(good_evidence(clock, ids), approvals_satisfied=False)
        rejected = kernel.decide(plan, candidate, evidence)
        saga = FakeSaga(SettlementReport(status="completed", completed_step_ids=()))
        with pytest.raises(GateFailedError, match="cannot apply"):
            kernel.apply(rejected, plan, saga)

    def test_apply_refuses_mismatched_plan(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        decision, _ = accepted_decision(kernel, clock, ids)
        other_candidate = make_candidate(clock, commit=OTHER_COMMIT)
        other_plan = make_plan(kernel, other_candidate)
        saga = FakeSaga(SettlementReport(status="completed", completed_step_ids=()))
        with pytest.raises(SecurityViolationError, match="same tested candidate"):
            kernel.apply(decision, other_plan, saga)

    def test_settlement_conflict_maps_to_conflict_error(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        decision, plan = accepted_decision(kernel, clock, ids)
        saga = FakeSaga(
            SettlementReport(
                status="conflict",
                completed_step_ids=(),
                failed_step_id="git-promotion-branch-update",
                detail="branch moved",
            )
        )
        with pytest.raises(ConflictError, match="branch moved"):
            kernel.apply(decision, plan, saga)

    def test_unknown_settlement_outcome_maps_to_outcome_unknown(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        decision, plan = accepted_decision(kernel, clock, ids)
        saga = FakeSaga(
            SettlementReport(
                status="outcome_unknown",
                completed_step_ids=("git-promotion-branch-update",),
                failed_step_id="graph-promotion",
            )
        )
        with pytest.raises(OutcomeUnknownError, match="graph-promotion"):
            kernel.apply(decision, plan, saga)


class TestRollback:
    def test_rollback_creates_new_compensating_record(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        decision, _ = accepted_decision(kernel, clock, ids)
        compensation = kernel.rollback(decision, reason="sentinel regression found post-apply")
        assert compensation.decision_id != decision.decision_id
        assert compensation.outcome == "rejected"
        assert compensation.candidate_commit == decision.candidate_commit
        assert compensation.evidence[0].ref_id == decision.decision_id
        # The original record is untouched: history is append-only.
        assert decision.outcome == "accepted"

    def test_rollback_of_non_accepted_decision_rejected(
        self, kernel: PromotionKernel, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        candidate = make_candidate(clock)
        plan = make_plan(kernel, candidate)
        evidence = replace(good_evidence(clock, ids), approvals_satisfied=False)
        rejected = kernel.decide(plan, candidate, evidence)
        with pytest.raises(InvalidInvocationError, match="only an accepted"):
            kernel.rollback(rejected, reason="nothing to roll back")


# ---------------------------------------------------------------------------
# Leakage audits
# ---------------------------------------------------------------------------


class TestSplitDisjointness:
    def test_disjoint_splits_pass(self) -> None:
        search = DatasetManifestV1(
            dataset_id="dataset:search",
            split=SplitKind.SEARCH,
            cases=[DatasetCaseV1(case_id="case:s1", digest=DigestRefV1(value=hex_of("s1")))],
        )
        violations = audit_split_disjointness([search, sealed_dataset()])
        assert violations == []

    def test_shared_case_digest_is_detected(self) -> None:
        shared = DigestRefV1(value=hex_of("promo-1"))
        search = DatasetManifestV1(
            dataset_id="dataset:search",
            split=SplitKind.SEARCH,
            cases=[DatasetCaseV1(case_id="case:copied", digest=shared)],
        )
        violations = audit_split_disjointness([search, sealed_dataset()])
        assert len(violations) == 1
        assert "search:dataset:search" in violations[0]
        assert "promotion:dataset:promotion" in violations[0]


class TestCandidateLeakage:
    def test_copied_promotion_case_in_worktree_is_detected(self) -> None:
        inspector = FakeInspector(
            files=["src/app.py", f"fixtures/{hex_of('promo-1')}.json"],
        )
        violations = audit_candidate_leakage(inspector, sealed_dataset())
        assert violations == ["worktree-files exposes sealed promotion case case:promo-1"]

    def test_env_argv_and_trace_surfaces_are_scanned(self) -> None:
        inspector = FakeInspector(
            env={"CHEAT": hex_of("promo-1")},
            argvs=[["pytest", "--case", "case:promo-2"]],
            trace=f"loading sealed case digest {hex_of('promo-2')}",
        )
        violations = audit_candidate_leakage(inspector, sealed_dataset())
        surfaces = {v.split(" ")[0] for v in violations}
        assert surfaces == {"environment", "argv", "trace"}

    def test_clean_candidate_has_no_violations(self) -> None:
        inspector = FakeInspector(
            files=["src/app.py"], env={"PATH": "/usr/bin"}, argvs=[["pytest"]], trace="ok"
        )
        assert audit_candidate_leakage(inspector, sealed_dataset()) == []

    def test_require_no_leakage_raises_security_violation(self) -> None:
        inspector = FakeInspector(files=[f"copied/{hex_of('promo-1')}"])
        with pytest.raises(SecurityViolationError, match="leakage audit failed"):
            require_no_leakage(inspector, sealed_dataset(), [sealed_dataset()])

    def test_require_no_leakage_passes_clean_setup(self) -> None:
        inspector = FakeInspector(files=["src/app.py"])
        require_no_leakage(inspector, sealed_dataset(), [sealed_dataset()])
