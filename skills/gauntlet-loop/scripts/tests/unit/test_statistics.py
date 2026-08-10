"""Statistics: sign test, t/bootstrap CIs, corrections, promotion gate math."""

from __future__ import annotations

import math

import pytest

from gauntlet.errors import (
    DependencyUnavailableError,
    InconclusiveError,
    InvalidInvocationError,
)
from gauntlet.models import MetricResultV1
from gauntlet.statistics import (
    MIN_BOOTSTRAP_SAMPLES,
    bootstrap_delta_ci,
    correct_p_values,
    paired_binary_test,
    paired_continuous_test,
    promotion_gate,
    protected_regression_violations,
    stats_available,
    target_effect_established,
)

pytestmark = pytest.mark.skipif(not stats_available(), reason="stats extra not installed")


def metric(value: float, lower: float | None, upper: float | None) -> MetricResultV1:
    return MetricResultV1(
        metric="delta",
        value=value,
        lower_bound=lower,
        upper_bound=upper,
        confidence_level=0.95,
    )


class TestPairedBinary:
    def test_strong_improvement_yields_expected_decision(self) -> None:
        from scipy.stats import binomtest

        # 18 candidate-only wins, 2 baseline-only wins, 5 concordant passes.
        baseline = [False] * 18 + [True] * 2 + [True] * 5
        candidate = [True] * 18 + [False] * 2 + [True] * 5
        result = paired_binary_test(baseline, candidate)

        expected_p = binomtest(18, 20, p=0.5, alternative="two-sided").pvalue
        assert result.p_value == pytest.approx(float(expected_p))
        assert result.n_discordant == 20
        assert result.candidate_wins == 18 and result.baseline_wins == 2
        assert result.effect.value == pytest.approx(16 / 25)
        # Decision, not float equality: the improvement is confidently positive.
        assert result.effect.lower_bound is not None
        assert result.effect.lower_bound > 0.0
        assert result.p_value < 0.01

    def test_weak_evidence_does_not_clear_a_practical_floor(self) -> None:
        baseline = [False, True, True, False, True, False]
        candidate = [True, False, True, True, True, False]
        result = paired_binary_test(baseline, candidate)
        assert result.p_value > 0.05
        assert result.effect.lower_bound is not None
        assert result.effect.lower_bound < 0.0  # CI straddles zero: no promotion

    def test_no_discordant_pairs_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="no discordant"):
            paired_binary_test([True, False], [True, False])

    def test_empty_input_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="no paired"):
            paired_binary_test([], [])

    def test_length_mismatch_rejected(self) -> None:
        with pytest.raises(InvalidInvocationError, match="equal length"):
            paired_binary_test([True], [True, False])


class TestPairedContinuous:
    BASELINE = [10.0, 12.0, 11.5, 9.8, 10.7, 11.2, 10.1, 12.3, 11.0, 10.4]
    CANDIDATE = [11.2, 13.1, 12.4, 11.0, 11.9, 12.0, 11.4, 13.0, 12.2, 11.5]

    def test_t_interval_matches_scipy_cross_check(self) -> None:
        import numpy as np
        from scipy.stats import t as t_dist

        result = paired_continuous_test(self.BASELINE, self.CANDIDATE)
        deltas = np.asarray(self.CANDIDATE) - np.asarray(self.BASELINE)
        n = len(deltas)
        sem = deltas.std(ddof=1) / math.sqrt(n)
        margin = float(t_dist.ppf(0.975, df=n - 1)) * sem
        assert result.effect.value == pytest.approx(float(deltas.mean()))
        assert result.effect.lower_bound == pytest.approx(float(deltas.mean()) - margin)
        assert result.effect.upper_bound == pytest.approx(float(deltas.mean()) + margin)
        # Decision: the improvement is confidently above zero.
        assert result.effect.lower_bound > 0.0

    def test_constant_delta_yields_degenerate_interval(self) -> None:
        result = paired_continuous_test([1.0, 2.0, 3.0], [2.0, 3.0, 4.0])
        assert result.effect.value == pytest.approx(1.0)
        assert result.effect.lower_bound == pytest.approx(1.0)
        assert result.effect.upper_bound == pytest.approx(1.0)

    def test_single_pair_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="at least 2"):
            paired_continuous_test([1.0], [2.0])

    def test_length_mismatch_rejected(self) -> None:
        with pytest.raises(InvalidInvocationError, match="equal length"):
            paired_continuous_test([1.0, 2.0], [1.0])


class TestBootstrap:
    BASELINE = [10.0, 12.0, 11.5, 9.8, 10.7, 11.2, 10.1, 12.3, 11.0, 10.4, 9.9, 11.8]
    CANDIDATE = [11.2, 13.1, 12.4, 11.0, 11.9, 12.0, 11.4, 13.0, 12.2, 11.5, 10.6, 12.9]

    def test_same_seed_same_interval(self) -> None:
        first = bootstrap_delta_ci(self.BASELINE, self.CANDIDATE, seed=42)
        second = bootstrap_delta_ci(self.BASELINE, self.CANDIDATE, seed=42)
        assert first.effect.lower_bound == second.effect.lower_bound
        assert first.effect.upper_bound == second.effect.upper_bound
        assert first.seed == 42

    def test_different_seed_may_differ(self) -> None:
        first = bootstrap_delta_ci(self.BASELINE, self.CANDIDATE, seed=1)
        second = bootstrap_delta_ci(self.BASELINE, self.CANDIDATE, seed=2)
        assert (first.effect.lower_bound, first.effect.upper_bound) != (
            second.effect.lower_bound,
            second.effect.upper_bound,
        )

    def test_underpowered_sample_is_inconclusive(self) -> None:
        short = [1.0] * (MIN_BOOTSTRAP_SAMPLES - 1)
        with pytest.raises(InconclusiveError, match="bootstrap needs at least"):
            bootstrap_delta_ci(short, [2.0] * len(short), seed=7)

    def test_bootstrap_interval_brackets_the_mean(self) -> None:
        result = bootstrap_delta_ci(self.BASELINE, self.CANDIDATE, seed=42)
        assert result.effect.lower_bound is not None
        assert result.effect.upper_bound is not None
        assert result.effect.lower_bound <= result.effect.value <= result.effect.upper_bound
        assert result.effect.lower_bound > 0.0  # confident improvement


class TestCorrections:
    def test_none_passthrough(self) -> None:
        assert correct_p_values([0.01, 0.04], "none") == [0.01, 0.04]

    def test_bonferroni(self) -> None:
        assert correct_p_values([0.01, 0.04, 0.5], "bonferroni") == pytest.approx(
            [0.03, 0.12, 1.0]
        )

    def test_holm_step_down(self) -> None:
        # Classic Holm example: sorted p (0.01, 0.02, 0.04) with m=3.
        adjusted = correct_p_values([0.04, 0.01, 0.02], "holm")
        assert adjusted == pytest.approx([0.04, 0.03, 0.04])

    def test_holm_is_monotone(self) -> None:
        adjusted = correct_p_values([0.011, 0.01, 0.9], "holm")
        assert adjusted[0] >= adjusted[1]

    def test_invalid_p_value_rejected(self) -> None:
        with pytest.raises(InvalidInvocationError, match="out of range"):
            correct_p_values([1.5], "bonferroni")

    def test_empty_input(self) -> None:
        assert correct_p_values([], "holm") == []


class TestPromotionGateMath:
    def test_protected_violation_rejects(self) -> None:
        violations = protected_regression_violations(
            {"latency-p95": metric(0.08, 0.02, 0.15)}, {"latency-p95": 0.10}
        )
        assert len(violations) == 1
        assert "latency-p95" in violations[0]

    def test_protected_within_budget_passes(self) -> None:
        assert (
            protected_regression_violations(
                {"latency-p95": metric(0.02, -0.01, 0.05)}, {"latency-p95": 0.10}
            )
            == []
        )

    def test_missing_protected_measurement_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="no measurement"):
            protected_regression_violations({}, {"latency-p95": 0.10})

    def test_missing_upper_bound_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="upper confidence bound"):
            protected_regression_violations(
                {"latency-p95": metric(0.02, None, None)}, {"latency-p95": 0.10}
            )

    def test_target_established_when_lower_bound_clears_floor(self) -> None:
        assert target_effect_established(metric(0.3, 0.15, 0.45), 0.1) is True

    def test_target_confidently_absent_when_upper_bound_below_floor(self) -> None:
        assert target_effect_established(metric(0.05, 0.01, 0.09), 0.1) is False

    def test_straddling_interval_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="underpowered"):
            target_effect_established(metric(0.12, 0.05, 0.2), 0.1)

    def test_unconfigured_floor_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="not configured"):
            target_effect_established(metric(0.3, 0.2, 0.4), None)

    def test_missing_target_is_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="no measurement"):
            target_effect_established(None, 0.1)

    def test_missing_bounds_are_inconclusive(self) -> None:
        with pytest.raises(InconclusiveError, match="confidence bounds"):
            target_effect_established(metric(0.3, None, None), 0.1)

    def test_gate_promotes_only_when_both_conditions_hold(self) -> None:
        result = promotion_gate(
            target=metric(0.3, 0.15, 0.45),
            minimum_practical_effect=0.1,
            protected={"latency-p95": metric(0.02, -0.01, 0.05)},
            budgets={"latency-p95": 0.10},
        )
        assert result.promote is True

    def test_huge_target_cannot_compensate_protected_regression(self) -> None:
        result = promotion_gate(
            target=metric(5.0, 4.0, 6.0),
            minimum_practical_effect=0.1,
            protected={"latency-p95": metric(0.5, 0.3, 0.9)},
            budgets={"latency-p95": 0.10},
        )
        assert result.promote is False
        assert "latency-p95" in result.reasons[0]

    def test_gate_rejects_confidently_absent_target(self) -> None:
        result = promotion_gate(
            target=metric(0.05, 0.01, 0.09),
            minimum_practical_effect=0.1,
            protected={},
            budgets={},
        )
        assert result.promote is False


class TestDependencyDegradation:
    def test_nontrivial_tests_require_scipy(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import gauntlet.statistics as stats_module

        monkeypatch.setattr(stats_module, "_STATS_AVAILABLE", False)
        with pytest.raises(DependencyUnavailableError, match="scipy"):
            paired_binary_test([False, True], [True, True])
        with pytest.raises(DependencyUnavailableError, match="scipy"):
            paired_continuous_test([1.0, 2.0], [2.0, 3.0])
        with pytest.raises(DependencyUnavailableError, match="scipy"):
            bootstrap_delta_ci([1.0] * 12, [2.0] * 12, seed=1)

    def test_gate_math_needs_no_scipy(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import gauntlet.statistics as stats_module

        monkeypatch.setattr(stats_module, "_STATS_AVAILABLE", False)
        result = promotion_gate(
            target=metric(0.3, 0.15, 0.45),
            minimum_practical_effect=0.1,
            protected={},
            budgets={},
        )
        assert result.promote is True
