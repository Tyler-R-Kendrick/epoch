"""Promotion statistics on top of established libraries (scipy/numpy).

Design rules that bind this module:

- significance tests come from scipy (exact sign test via ``binomtest``,
  t-based confidence intervals via ``scipy.stats.t``); when scipy is not
  installed and a nontrivial test is requested, raise
  ``DependencyUnavailableError`` — a hand-rolled fallback is forbidden;
- bootstrap runs only with a recorded seed and enough samples;
- underpowered, noisy, missing, or contradictory evidence raises
  ``InconclusiveError`` (exit-code 5 semantics) — it is never rounded up;
- every function is deterministic given its inputs and seed.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from importlib import util as _importlib_util
from typing import Literal

from gauntlet.errors import DependencyUnavailableError, InconclusiveError, InvalidInvocationError
from gauntlet.models import MetricResultV1

MIN_BOOTSTRAP_SAMPLES = 10
DEFAULT_BOOTSTRAP_RESAMPLES = 2000

CorrectionMethod = Literal["none", "bonferroni", "holm"]

_STATS_AVAILABLE = (
    _importlib_util.find_spec("numpy") is not None
    and _importlib_util.find_spec("scipy") is not None
)


def stats_available() -> bool:
    return _STATS_AVAILABLE


def _require_stats(operation: str) -> None:
    if not _STATS_AVAILABLE:
        raise DependencyUnavailableError(
            f"{operation} requires scipy and numpy",
            hint="install the 'stats' extra: uv sync --extra stats; "
            "hand-rolled significance tests are forbidden by policy",
        )


# ---------------------------------------------------------------------------
# Paired binary outcomes: exact sign test
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PairedBinaryResult:
    """Exact sign test over paired pass/fail outcomes."""

    p_value: float
    effect: MetricResultV1
    n_pairs: int
    n_discordant: int
    candidate_wins: int
    baseline_wins: int
    method: str


def paired_binary_test(
    baseline: Sequence[bool],
    candidate: Sequence[bool],
    *,
    confidence_level: float = 0.95,
    metric: str = "success-rate-delta",
) -> PairedBinaryResult:
    """Exact sign test (scipy ``binomtest``) on discordant pairs.

    The effect is the success-proportion delta over all pairs; its confidence
    interval is the Wilson interval for the candidate-win share among
    discordant pairs, mapped through the (monotone) delta transform.
    """
    if len(baseline) != len(candidate):
        raise InvalidInvocationError("paired samples must have equal length")
    n = len(baseline)
    if n == 0:
        raise InconclusiveError("no paired observations")
    _require_stats("paired binary sign test")
    from scipy.stats import binomtest

    wins = sum(1 for b, c in zip(baseline, candidate, strict=True) if c and not b)
    losses = sum(1 for b, c in zip(baseline, candidate, strict=True) if b and not c)
    discordant = wins + losses
    if discordant == 0:
        raise InconclusiveError(
            "no discordant pairs: the paired binary outcomes carry no evidence of a difference"
        )
    test = binomtest(wins, discordant, p=0.5, alternative="two-sided")
    ci = test.proportion_ci(confidence_level=confidence_level, method="wilson")
    scale = discordant / n
    effect = MetricResultV1(
        metric=metric,
        value=(wins - losses) / n,
        n=n,
        lower_bound=(2.0 * float(ci.low) - 1.0) * scale,
        upper_bound=(2.0 * float(ci.high) - 1.0) * scale,
        confidence_level=confidence_level,
    )
    return PairedBinaryResult(
        p_value=float(test.pvalue),
        effect=effect,
        n_pairs=n,
        n_discordant=discordant,
        candidate_wins=wins,
        baseline_wins=losses,
        method="exact-sign-test/binomtest+wilson",
    )


# ---------------------------------------------------------------------------
# Paired continuous/ordinal deltas
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PairedContinuousResult:
    """Mean paired delta with a t-based confidence interval."""

    effect: MetricResultV1
    n_pairs: int
    method: str


def paired_continuous_test(
    baseline: Sequence[float],
    candidate: Sequence[float],
    *,
    confidence_level: float = 0.95,
    metric: str = "mean-delta",
) -> PairedContinuousResult:
    """Mean delta with a Student-t confidence interval (scipy)."""
    if len(baseline) != len(candidate):
        raise InvalidInvocationError("paired samples must have equal length")
    n = len(baseline)
    if n < 2:
        raise InconclusiveError(f"need at least 2 paired observations, got {n}")
    _require_stats("paired continuous t interval")
    import numpy as np
    from scipy.stats import t as t_dist

    deltas = np.asarray(candidate, dtype=float) - np.asarray(baseline, dtype=float)
    mean = float(deltas.mean())
    sem = float(deltas.std(ddof=1)) / float(np.sqrt(n))
    if sem == 0.0:
        lower = upper = mean
    else:
        margin = float(t_dist.ppf((1.0 + confidence_level) / 2.0, df=n - 1)) * sem
        lower, upper = mean - margin, mean + margin
    effect = MetricResultV1(
        metric=metric,
        value=mean,
        n=n,
        lower_bound=lower,
        upper_bound=upper,
        confidence_level=confidence_level,
    )
    return PairedContinuousResult(effect=effect, n_pairs=n, method="paired-t/scipy.stats.t")


@dataclass(frozen=True)
class BootstrapResult:
    """Percentile bootstrap CI for the mean paired delta, seed recorded."""

    effect: MetricResultV1
    n_pairs: int
    seed: int
    resamples: int
    method: str


def bootstrap_delta_ci(
    baseline: Sequence[float],
    candidate: Sequence[float],
    *,
    seed: int,
    confidence_level: float = 0.95,
    resamples: int = DEFAULT_BOOTSTRAP_RESAMPLES,
    metric: str = "mean-delta",
) -> BootstrapResult:
    """Percentile bootstrap of the mean paired delta with a recorded seed."""
    if len(baseline) != len(candidate):
        raise InvalidInvocationError("paired samples must have equal length")
    if resamples < 1:
        raise InvalidInvocationError("resamples must be >= 1")
    n = len(baseline)
    if n < MIN_BOOTSTRAP_SAMPLES:
        raise InconclusiveError(
            f"bootstrap needs at least {MIN_BOOTSTRAP_SAMPLES} pairs, got {n}",
            hint="collect more paired observations; do not promote on underpowered evidence",
        )
    _require_stats("bootstrap confidence interval")
    import numpy as np

    deltas = np.asarray(candidate, dtype=float) - np.asarray(baseline, dtype=float)
    rng = np.random.default_rng(seed)
    indices = rng.integers(0, n, size=(resamples, n))
    means = deltas[indices].mean(axis=1)
    alpha = 1.0 - confidence_level
    lower = float(np.quantile(means, alpha / 2.0))
    upper = float(np.quantile(means, 1.0 - alpha / 2.0))
    effect = MetricResultV1(
        metric=metric,
        value=float(deltas.mean()),
        n=n,
        lower_bound=lower,
        upper_bound=upper,
        confidence_level=confidence_level,
    )
    return BootstrapResult(
        effect=effect,
        n_pairs=n,
        seed=seed,
        resamples=resamples,
        method="percentile-bootstrap/numpy.default_rng",
    )


# ---------------------------------------------------------------------------
# Multiple-comparison correction
# ---------------------------------------------------------------------------


def correct_p_values(p_values: Sequence[float], method: CorrectionMethod) -> list[float]:
    """Apply the ConfidencePolicyV1 multiple-comparison correction."""
    for p in p_values:
        if not 0.0 <= p <= 1.0:
            raise InvalidInvocationError(f"p-value out of range: {p}")
    m = len(p_values)
    if method == "none" or m == 0:
        return list(p_values)
    if method == "bonferroni":
        return [min(1.0, p * m) for p in p_values]
    # Holm step-down: adjusted p is monotone over the ascending order.
    order = sorted(range(m), key=lambda i: p_values[i])
    adjusted = [0.0] * m
    running_max = 0.0
    for rank, index in enumerate(order):
        value = min(1.0, (m - rank) * p_values[index])
        running_max = max(running_max, value)
        adjusted[index] = running_max
    return adjusted


# ---------------------------------------------------------------------------
# Promotion gate math
# ---------------------------------------------------------------------------


def protected_regression_violations(
    protected: Mapping[str, MetricResultV1],
    budgets: Mapping[str, float],
) -> list[str]:
    """Budgeted dimensions whose regression upper CI bound breaches budget.

    Missing measurements or missing bounds are not silently forgiven: they
    raise ``InconclusiveError`` because absence of evidence never counts as
    staying within budget.
    """
    violations: list[str] = []
    for dimension, budget in sorted(budgets.items()):
        measured = protected.get(dimension)
        if measured is None:
            raise InconclusiveError(
                f"protected dimension {dimension!r} has no measurement; cannot certify budget"
            )
        if measured.upper_bound is None:
            raise InconclusiveError(
                f"protected dimension {dimension!r} has no upper confidence bound"
            )
        if measured.upper_bound >= budget:
            violations.append(
                f"protected dimension {dimension!r} regression upper bound "
                f"{measured.upper_bound:.6g} breaches budget {budget:.6g}"
            )
    return violations


def target_effect_established(
    target: MetricResultV1 | None,
    minimum_practical_effect: float | None,
) -> bool:
    """True when the target delta's lower CI bound clears the practical floor.

    Returns ``False`` only when the evidence confidently shows no practical
    effect (upper bound at or below the floor). Everything in between —
    missing configuration, missing bounds, or a CI straddling the floor —
    raises ``InconclusiveError``.
    """
    if minimum_practical_effect is None:
        raise InconclusiveError(
            "minimum_practical_effect is not configured; refusing to infer a threshold"
        )
    if target is None:
        raise InconclusiveError("target dimension has no measurement")
    if target.lower_bound is None or target.upper_bound is None:
        raise InconclusiveError("target dimension has no confidence bounds")
    if target.lower_bound > minimum_practical_effect:
        return True
    if target.upper_bound <= minimum_practical_effect:
        return False
    raise InconclusiveError(
        "target effect is underpowered: the confidence interval "
        f"[{target.lower_bound:.6g}, {target.upper_bound:.6g}] straddles the "
        f"minimum practical effect {minimum_practical_effect:.6g}"
    )


@dataclass(frozen=True)
class PromotionGateResult:
    promote: bool
    reasons: tuple[str, ...]


def promotion_gate(
    *,
    target: MetricResultV1 | None,
    minimum_practical_effect: float | None,
    protected: Mapping[str, MetricResultV1],
    budgets: Mapping[str, float],
) -> PromotionGateResult:
    """The default conceptual promotion gate.

    ``lower_confidence_bound(target_delta) > minimum_practical_effect`` and
    ``upper_confidence_bound(regression_j) < allowed_budget_j`` for every
    protected dimension j. There is no weighted-average path: a protected
    violation rejects regardless of target magnitude, and inconclusive
    evidence raises ``InconclusiveError``.
    """
    violations = protected_regression_violations(protected, budgets)
    if violations:
        return PromotionGateResult(promote=False, reasons=tuple(violations))
    if not target_effect_established(target, minimum_practical_effect):
        return PromotionGateResult(
            promote=False,
            reasons=("target effect upper bound does not clear the minimum practical effect",),
        )
    return PromotionGateResult(promote=True, reasons=())
