"""Evaluator registry, command execution, ladder ordering, and calibration.

Evaluators are declared in ``.gauntlet/evaluators/`` manifests, validated as
:class:`gauntlet.models.EvaluatorManifestV1`, and executed through injected
seams (:class:`gauntlet.support.ProcessRunner`) so tests stay deterministic.

Structured output is the contract: a command evaluator writes
``.gauntlet-result.json`` in the ``dev.gauntlet.evaluator-output/v1`` format
defined here. Log scraping is opt-in via an explicit, versioned
:class:`LogParser`; the raw log digest is always retained.
"""

from __future__ import annotations

import hashlib
import json
import random
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path
from typing import Literal, Protocol

import yaml
from pydantic import Field, ValidationError

from gauntlet.canonical_json import digest_bytes, digest_value
from gauntlet.constants import EvaluatorRole, SplitKind
from gauntlet.errors import (
    GateFailedError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.models import (
    DatasetCaseV1,
    DatasetManifestV1,
    EvaluationResultV1,
    EvaluatorManifestV1,
    GauntletModel,
    MetricResultV1,
    NonEmptyStr,
    SpecEvaluatorsV1,
)
from gauntlet.support import Clock, CompletedProcess, IdGenerator, ProcessRunner

EVALUATOR_OUTPUT_FORMAT = "dev.gauntlet.evaluator-output/v1"
RESULT_FILENAME = ".gauntlet-result.json"
REGISTRY_MANIFEST_FILENAME = "manifest.yaml"

Verdict = Literal["good", "bad", "tie", "abstain"]
PairwiseVerdict = Literal["a", "b", "tie", "abstain"]

# Subjective kinds may never claim the hard-invariant role: a persuasive
# judge must not be able to override (or masquerade as) a hard invariant.
_SUBJECTIVE_KINDS = frozenset({"learned", "llm-judge"})


class EvaluatorMetricV1(GauntletModel):
    """One metric row inside the structured evaluator output."""

    metric: NonEmptyStr
    value: float
    unit: str | None = None
    n: int | None = Field(default=None, ge=0)


class EvaluatorOutputV1(GauntletModel):
    """The ``dev.gauntlet.evaluator-output/v1`` structured output contract."""

    schema_version: Literal["dev.gauntlet.evaluator-output/v1"] = (
        "dev.gauntlet.evaluator-output/v1"
    )
    passed: bool | None = None
    metrics: list[EvaluatorMetricV1] = Field(default_factory=list)
    abstained: bool = False
    details: str | None = None


class LogParser(Protocol):
    """Explicit, versioned parser for legacy log-only evaluators."""

    @property
    def parser_id(self) -> str: ...

    @property
    def version(self) -> str: ...

    def parse(self, stdout: str, stderr: str, exit_code: int) -> EvaluatorOutputV1: ...


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RegisteredEvaluator:
    manifest: EvaluatorManifestV1
    manifest_digest: str
    source_file: str


class EvaluatorRegistry:
    """Loads and validates evaluator manifests from ``.gauntlet/evaluators/``."""

    def __init__(self, entries: Mapping[str, RegisteredEvaluator]) -> None:
        self._entries = dict(entries)

    @classmethod
    def load(cls, evaluators_dir: Path) -> EvaluatorRegistry:
        index_file = evaluators_dir / REGISTRY_MANIFEST_FILENAME
        if not index_file.is_file():
            raise InvalidInvocationError(
                f"evaluator registry manifest not found: {index_file}",
                hint="create .gauntlet/evaluators/manifest.yaml listing evaluator files",
            )
        index = yaml.safe_load(index_file.read_text(encoding="utf-8"))
        if not isinstance(index, dict) or not isinstance(index.get("evaluators"), list):
            raise InvalidInvocationError(
                "evaluator registry manifest must be a mapping with an 'evaluators' list"
            )
        entries: dict[str, RegisteredEvaluator] = {}
        for filename in index["evaluators"]:
            if not isinstance(filename, str):
                raise InvalidInvocationError(f"evaluator filename must be a string: {filename!r}")
            candidate = (evaluators_dir / filename).resolve()
            root = evaluators_dir.resolve()
            if not candidate.is_relative_to(root):
                raise SecurityViolationError(
                    f"evaluator file escapes the evaluators directory: {filename!r}"
                )
            if not candidate.is_file():
                raise InvalidInvocationError(f"evaluator file not found: {filename!r}")
            raw = candidate.read_text(encoding="utf-8")
            try:
                manifest = EvaluatorManifestV1.model_validate(yaml.safe_load(raw))
            except ValidationError as error:
                raise InvalidInvocationError(
                    f"invalid evaluator manifest {filename!r}: {error}"
                ) from error
            _validate_manifest(manifest, filename)
            if manifest.id in entries:
                raise InvalidInvocationError(f"duplicate evaluator id: {manifest.id}")
            entries[manifest.id] = RegisteredEvaluator(
                manifest=manifest,
                manifest_digest=digest_value(manifest.model_dump(mode="json")),
                source_file=filename,
            )
        return cls(entries)

    def get(self, evaluator_id: str) -> RegisteredEvaluator:
        entry = self._entries.get(evaluator_id)
        if entry is None:
            raise InvalidInvocationError(f"unknown evaluator: {evaluator_id}")
        return entry

    def ids(self) -> list[str]:
        return sorted(self._entries)

    def frozen_digests(self) -> dict[str, str]:
        """Manifest digests for every ``frozen_for_promotion`` evaluator."""
        return {
            evaluator_id: entry.manifest_digest
            for evaluator_id, entry in sorted(self._entries.items())
            if entry.manifest.frozen_for_promotion
        }


def _validate_manifest(manifest: EvaluatorManifestV1, filename: str) -> None:
    if manifest.kind == "command" and manifest.command is None:
        raise InvalidInvocationError(
            f"evaluator {manifest.id!r} ({filename}) is kind=command but declares no command"
        )
    if manifest.kind in _SUBJECTIVE_KINDS and EvaluatorRole.INVARIANT_CHECKER in manifest.roles:
        raise InvalidInvocationError(
            f"evaluator {manifest.id!r} ({filename}) is subjective (kind={manifest.kind}) "
            "and may not declare the invariant-checker role"
        )


def verify_frozen_digests(recorded: Mapping[str, str], current: Mapping[str, str]) -> None:
    """Frozen evaluator manifests must be byte-identical at promotion time."""
    problems: list[str] = []
    for evaluator_id, digest in sorted(recorded.items()):
        actual = current.get(evaluator_id)
        if actual is None:
            problems.append(f"frozen evaluator missing: {evaluator_id}")
        elif actual != digest:
            problems.append(f"frozen evaluator digest changed: {evaluator_id}")
    if problems:
        raise SecurityViolationError(
            "frozen evaluator integrity violated:\n" + "\n".join(problems),
            hint="an evaluator that decides promotion must not change between freeze and decide",
        )


# ---------------------------------------------------------------------------
# Command evaluator
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CommandEvaluationOutcome:
    """Full record of one command-evaluator run."""

    evaluation: EvaluationResultV1
    output: EvaluatorOutputV1
    process: CompletedProcess
    raw_output_digest: str
    parser_id: str | None = None
    parser_version: str | None = None


class CommandEvaluator:
    """Runs an ``EvaluatorCommandV1`` via the injected process runner.

    Network denial is process discipline, not a sandbox: only allowlisted
    environment variables pass through and proxy variables are pinned off.
    """

    def __init__(
        self,
        manifest: EvaluatorManifestV1,
        *,
        runner: ProcessRunner,
        clock: Clock,
        ids: IdGenerator,
        log_parser: LogParser | None = None,
    ) -> None:
        if manifest.command is None:
            raise InvalidInvocationError(f"evaluator {manifest.id!r} declares no command")
        declared_format = manifest.output_contract.get("format")
        if declared_format not in (None, EVALUATOR_OUTPUT_FORMAT) and log_parser is None:
            raise InvalidInvocationError(
                f"evaluator {manifest.id!r} declares output format {declared_format!r}; "
                f"only {EVALUATOR_OUTPUT_FORMAT} is supported without an explicit LogParser"
            )
        self._manifest = manifest
        self._command = manifest.command
        self._runner = runner
        self._clock = clock
        self._ids = ids
        self._log_parser = log_parser
        result_file = manifest.output_contract.get("result_file", RESULT_FILENAME)
        if not isinstance(result_file, str) or "/" in result_file or result_file.startswith(".."):
            raise InvalidInvocationError(f"unsafe evaluator result_file: {result_file!r}")
        self._result_filename = result_file

    def run(
        self,
        *,
        candidate_worktree: Path,
        candidate_id: str,
        split: SplitKind,
        base_env: Mapping[str, str] | None = None,
        staging_dir: Path | None = None,
        project_root: Path | None = None,
    ) -> CommandEvaluationOutcome:
        cwd = self._resolve_cwd(candidate_worktree, staging_dir, project_root)
        env = self._build_env(base_env or {})
        started_at = self._clock.now()
        process = self._runner.run(
            list(self._command.argv),
            cwd=cwd,
            env=env,
            timeout_seconds=self._command.timeout_seconds,
        )
        finished_at = self._clock.now()
        if process.timed_out:
            raise GateFailedError(
                f"evaluator {self._manifest.id!r} timed out "
                f"after {self._command.timeout_seconds}s"
            )
        output, raw_digest, parser_id, parser_version = self._collect_output(cwd, process)
        evaluation = EvaluationResultV1(
            evaluation_id=self._ids.new_id("evaluation"),
            evaluator_id=self._manifest.id,
            evaluator_version=self._manifest.version,
            candidate_id=candidate_id,
            split=split,
            passed=output.passed,
            metrics=[
                MetricResultV1(metric=m.metric, value=m.value, unit=m.unit, n=m.n)
                for m in output.metrics
            ],
            raw_output_digest=raw_digest,
            abstained=output.abstained,
            started_at=started_at,
            finished_at=finished_at,
        )
        return CommandEvaluationOutcome(
            evaluation=evaluation,
            output=output,
            process=process,
            raw_output_digest=raw_digest,
            parser_id=parser_id,
            parser_version=parser_version,
        )

    def _resolve_cwd(
        self,
        candidate_worktree: Path,
        staging_dir: Path | None,
        project_root: Path | None,
    ) -> Path:
        if self._command.cwd == "candidate-worktree":
            return candidate_worktree
        if self._command.cwd == "staging":
            if staging_dir is None:
                raise InvalidInvocationError(
                    f"evaluator {self._manifest.id!r} requires a staging directory"
                )
            return staging_dir
        if project_root is None:
            raise InvalidInvocationError(
                f"evaluator {self._manifest.id!r} requires the project root"
            )
        return project_root

    def _build_env(self, base_env: Mapping[str, str]) -> dict[str, str]:
        env = {
            name: base_env[name]
            for name in self._command.environment_allowlist
            if name in base_env
        }
        if self._command.network == "deny":
            env.update(
                {
                    "GAUNTLET_NETWORK": "deny",
                    "NO_PROXY": "*",
                    "no_proxy": "*",
                    "HTTP_PROXY": "http://127.0.0.1:1",
                    "HTTPS_PROXY": "http://127.0.0.1:1",
                }
            )
        else:
            env["GAUNTLET_NETWORK"] = "allow"
        return env

    def _collect_output(
        self, cwd: Path, process: CompletedProcess
    ) -> tuple[EvaluatorOutputV1, str, str | None, str | None]:
        result_path = cwd / self._result_filename
        if result_path.is_file():
            raw = result_path.read_bytes()
            try:
                output = EvaluatorOutputV1.model_validate(json.loads(raw))
            except (json.JSONDecodeError, ValidationError) as error:
                raise GateFailedError(
                    f"evaluator {self._manifest.id!r} wrote an invalid "
                    f"{EVALUATOR_OUTPUT_FORMAT} result: {error}"
                ) from error
            return output, digest_bytes(raw), None, None
        if self._log_parser is not None:
            raw_log = f"{process.stdout}\n{process.stderr}".encode()
            output = self._log_parser.parse(process.stdout, process.stderr, process.exit_code)
            return output, digest_bytes(raw_log), self._log_parser.parser_id, (
                self._log_parser.version
            )
        raise GateFailedError(
            f"evaluator {self._manifest.id!r} produced no {self._result_filename} "
            "and no LogParser is configured",
            hint="the structured output contract is mandatory unless an explicit parser is given",
        )


# ---------------------------------------------------------------------------
# Evaluation ladder
# ---------------------------------------------------------------------------

LADDER_STAGES: tuple[str, ...] = (
    "hard",
    "deterministic",
    "simulators",
    "learned",
    "llm_judges",
    "human",
)


@dataclass(frozen=True)
class LadderEntry:
    stage: str
    evaluator_id: str

    @property
    def hard(self) -> bool:
        return self.stage == "hard"


def ladder_order(evaluators: SpecEvaluatorsV1) -> list[LadderEntry]:
    """Cheapest-trustworthy-first run order per the evaluation ladder."""
    entries: list[LadderEntry] = []
    for stage in LADDER_STAGES:
        for evaluator_id in getattr(evaluators, stage):
            entries.append(LadderEntry(stage=stage, evaluator_id=evaluator_id))
    return entries


@dataclass(frozen=True)
class LadderRunResult:
    results: tuple[EvaluationResultV1, ...]
    calibration_only_results: tuple[EvaluationResultV1, ...]
    short_circuited: bool
    failed_hard_evaluator: str | None


def run_ladder(
    evaluators: SpecEvaluatorsV1,
    execute: Callable[[LadderEntry], EvaluationResultV1],
    *,
    run_subjective_for_calibration: bool = False,
) -> LadderRunResult:
    """Run the ladder; a hard-invariant failure short-circuits by default.

    After a hard failure, later evaluators are never consulted for pass/fail.
    With ``run_subjective_for_calibration`` they still execute, but their
    results are segregated as calibration-only.
    """
    results: list[EvaluationResultV1] = []
    calibration_only: list[EvaluationResultV1] = []
    failed_hard: str | None = None
    for entry in ladder_order(evaluators):
        if failed_hard is not None:
            if run_subjective_for_calibration:
                calibration_only.append(execute(entry))
            continue
        result = execute(entry)
        results.append(result)
        if entry.hard and result.passed is False:
            failed_hard = entry.evaluator_id
    return LadderRunResult(
        results=tuple(results),
        calibration_only_results=tuple(calibration_only),
        short_circuited=failed_hard is not None,
        failed_hard_evaluator=failed_hard,
    )


# ---------------------------------------------------------------------------
# Calibration against known outcomes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CalibrationCaseOutcome:
    case_id: str
    expected: Verdict
    verdicts: tuple[Verdict, ...]
    matched: bool
    consistent: bool


@dataclass(frozen=True)
class CalibrationReport:
    dataset_id: str
    outcomes: tuple[CalibrationCaseOutcome, ...]
    metrics: tuple[MetricResultV1, ...]

    def metric(self, name: str) -> MetricResultV1:
        for entry in self.metrics:
            if entry.metric == name:
                return entry
        raise InvalidInvocationError(f"calibration metric not computed: {name}")


def calibrate_evaluator(
    dataset: DatasetManifestV1,
    judge: Callable[[DatasetCaseV1], Verdict],
    *,
    repeats: int = 1,
) -> CalibrationReport:
    """Accuracy/consistency against known-outcome calibration cases.

    Only metrics computed from real judged fixtures are emitted; order and
    verbosity bias come from :class:`PairwiseJudgeHarness`, never fabricated.
    """
    if repeats < 1:
        raise InvalidInvocationError("repeats must be >= 1")
    if not dataset.cases:
        raise InvalidInvocationError(f"dataset {dataset.dataset_id!r} has no calibration cases")
    outcomes: list[CalibrationCaseOutcome] = []
    for case in dataset.cases:
        if case.expected is None:
            raise InvalidInvocationError(
                f"calibration case {case.case_id!r} has no expected outcome"
            )
        verdicts = tuple(judge(case) for _ in range(repeats))
        outcomes.append(
            CalibrationCaseOutcome(
                case_id=case.case_id,
                expected=case.expected,
                verdicts=verdicts,
                matched=verdicts[0] == case.expected,
                consistent=len(set(verdicts)) == 1,
            )
        )
    total = len(outcomes)
    metrics = [
        MetricResultV1(
            metric="calibration-accuracy",
            value=sum(1 for o in outcomes if o.matched) / total,
            n=total,
        ),
        MetricResultV1(
            metric="calibration-consistency",
            value=sum(1 for o in outcomes if o.consistent) / total,
            n=total * repeats,
        ),
    ]
    return CalibrationReport(
        dataset_id=dataset.dataset_id,
        outcomes=tuple(outcomes),
        metrics=tuple(metrics),
    )


# ---------------------------------------------------------------------------
# Pairwise judging harness (learned / LLM / human judges)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PairwiseItem:
    label: str
    text: str


PairwiseJudge = Callable[[str, str], PairwiseVerdict]
"""Judge sees two blinded texts (first, second) and votes positionally."""


@dataclass(frozen=True)
class PairwiseVote:
    pair_index: int
    presentation: Literal["primary", "swapped"]
    first_blinded: str
    second_blinded: str
    verdict: PairwiseVerdict
    winner_label: str | None
    abstained: bool


@dataclass(frozen=True)
class PairwiseReport:
    seed: int
    votes: tuple[PairwiseVote, ...]
    winners: tuple[str | None, ...]
    order_disagreements: tuple[int, ...]
    order_sensitivity: MetricResultV1
    verbosity_preference: MetricResultV1 | None


class PairwiseJudgeHarness:
    """Blind, order-randomized pairwise judging with recorded seed.

    Candidate identity is blinded by hashing labels with a seed-derived salt;
    each pair is judged in both orders so order sensitivity is measured, not
    assumed. Ties and abstentions are permitted and preserved as raw votes.
    """

    def __init__(self, judge: PairwiseJudge, *, seed: int) -> None:
        self._judge = judge
        self._seed = seed

    def _blind(self, label: str) -> str:
        salted = f"{self._seed}:{label}".encode()
        return "item-" + hashlib.sha256(salted).hexdigest()[:12]

    def judge_pairs(self, pairs: Sequence[tuple[PairwiseItem, PairwiseItem]]) -> PairwiseReport:
        if not pairs:
            raise InvalidInvocationError("no pairs to judge")
        rng = random.Random(self._seed)  # noqa: S311 - reproducible shuffling, not crypto
        votes: list[PairwiseVote] = []
        winners: list[str | None] = []
        disagreements: list[int] = []
        longer_wins = 0
        decided = 0
        for index, (left, right) in enumerate(pairs):
            primary = (left, right) if rng.random() < 0.5 else (right, left)
            swapped = (primary[1], primary[0])
            per_order: list[str | None] = []
            for presentation, (first, second) in (("primary", primary), ("swapped", swapped)):
                verdict = self._judge(first.text, second.text)
                winner: str | None
                if verdict == "a":
                    winner = first.label
                elif verdict == "b":
                    winner = second.label
                else:
                    winner = None
                votes.append(
                    PairwiseVote(
                        pair_index=index,
                        presentation="primary" if presentation == "primary" else "swapped",
                        first_blinded=self._blind(first.label),
                        second_blinded=self._blind(second.label),
                        verdict=verdict,
                        winner_label=winner,
                        abstained=verdict == "abstain",
                    )
                )
                per_order.append(winner)
                if winner is not None:
                    decided += 1
                    longer = left if len(left.text) > len(right.text) else right
                    if len(left.text) != len(right.text) and winner == longer.label:
                        longer_wins += 1
            if per_order[0] == per_order[1]:
                winners.append(per_order[0])
            else:
                winners.append(None)
                disagreements.append(index)
        order_sensitivity = MetricResultV1(
            metric="order-sensitivity",
            value=len(disagreements) / len(pairs),
            n=len(pairs),
        )
        verbosity: MetricResultV1 | None = None
        if decided:
            verbosity = MetricResultV1(
                metric="verbosity-preference",
                value=longer_wins / decided,
                n=decided,
            )
        return PairwiseReport(
            seed=self._seed,
            votes=tuple(votes),
            winners=tuple(winners),
            order_disagreements=tuple(disagreements),
            order_sensitivity=order_sensitivity,
            verbosity_preference=verbosity,
        )


# ---------------------------------------------------------------------------
# Independence enforcement: candidate-modified evaluator detection
# ---------------------------------------------------------------------------

_DEFAULT_EVALUATOR_GLOBS: tuple[str, ...] = (".gauntlet/evaluators/**",)


def evaluator_source_globs(manifest: EvaluatorManifestV1) -> tuple[str, ...]:
    declared = manifest.input_contract.get("source_globs", [])
    if not isinstance(declared, list) or not all(isinstance(g, str) for g in declared):
        raise InvalidInvocationError(
            f"evaluator {manifest.id!r} input_contract.source_globs must be a list of strings"
        )
    return tuple(declared) + _DEFAULT_EVALUATOR_GLOBS


def detect_self_modification(
    manifest: EvaluatorManifestV1,
    changed_paths: Sequence[str],
    *,
    source_globs: Sequence[str] | None = None,
) -> list[str]:
    """Paths changed by the candidate that touch this evaluator's sources."""
    globs = tuple(source_globs) if source_globs is not None else evaluator_source_globs(manifest)
    flagged: list[str] = []
    for path in changed_paths:
        normalized = path.replace("\\", "/")
        if any(fnmatch(normalized, glob) for glob in globs):
            flagged.append(normalized)
    return flagged


def require_no_self_modification(
    manifest: EvaluatorManifestV1,
    changed_paths: Sequence[str],
    *,
    source_globs: Sequence[str] | None = None,
) -> None:
    """A candidate-modified evaluator can never approve that candidate."""
    flagged = detect_self_modification(manifest, changed_paths, source_globs=source_globs)
    if flagged:
        raise GateFailedError(
            f"candidate modified evaluator {manifest.id!r} sources: " + ", ".join(sorted(flagged)),
            hint="an evaluator changed by the candidate cannot decide that candidate's promotion",
        )
