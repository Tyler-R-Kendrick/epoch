"""Evaluator registry, command execution, ladder, calibration, pairwise."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
import yaml

from gauntlet.canonical_json import digest_bytes
from gauntlet.constants import EvaluatorRole, IndependenceLevel, SplitKind
from gauntlet.errors import (
    GateFailedError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.evaluators import (
    RESULT_FILENAME,
    CommandEvaluator,
    EvaluatorOutputV1,
    EvaluatorRegistry,
    LadderEntry,
    PairwiseItem,
    PairwiseJudgeHarness,
    calibrate_evaluator,
    detect_self_modification,
    ladder_order,
    require_no_self_modification,
    run_ladder,
    verify_frozen_digests,
)
from gauntlet.models import (
    DatasetCaseV1,
    DatasetManifestV1,
    DigestRefV1,
    EvaluationResultV1,
    EvaluatorManifestV1,
    SpecEvaluatorsV1,
)
from gauntlet.support import (
    CompletedProcess,
    FrozenClock,
    SequentialIdGenerator,
    SubprocessRunner,
)


def make_manifest(**overrides: object) -> EvaluatorManifestV1:
    payload: dict[str, object] = {
        "id": "evaluator:parse-and-test",
        "kind": "command",
        "roles": [EvaluatorRole.INVARIANT_CHECKER, EvaluatorRole.COMPARATOR],
        "independence": IndependenceLevel.L4,
        "command": {
            "argv": [sys.executable, "run_eval.py"],
            "cwd": "candidate-worktree",
            "timeout_seconds": 60,
        },
        "frozen_for_promotion": True,
    }
    payload.update(overrides)
    return EvaluatorManifestV1.model_validate(payload)


def hex_digest(token: str) -> str:
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


class TestRegistry:
    def write_registry(self, root: Path, manifests: list[EvaluatorManifestV1]) -> Path:
        root.mkdir(parents=True, exist_ok=True)
        filenames = []
        for manifest in manifests:
            name = manifest.id.split(":", 1)[1] + ".yaml"
            (root / name).write_text(
                yaml.safe_dump(manifest.model_dump(mode="json")), encoding="utf-8"
            )
            filenames.append(name)
        (root / "manifest.yaml").write_text(
            yaml.safe_dump({"evaluators": filenames}), encoding="utf-8"
        )
        return root

    def test_load_records_digest_and_independence(self, tmp_path: Path) -> None:
        root = self.write_registry(tmp_path / "evaluators", [make_manifest()])
        registry = EvaluatorRegistry.load(root)
        entry = registry.get("evaluator:parse-and-test")
        assert entry.manifest.independence is IndependenceLevel.L4
        assert entry.manifest_digest.startswith("sha256:")
        assert registry.ids() == ["evaluator:parse-and-test"]

    def test_frozen_digests_only_include_frozen(self, tmp_path: Path) -> None:
        frozen = make_manifest()
        unfrozen = make_manifest(id="evaluator:advisory", frozen_for_promotion=False)
        root = self.write_registry(tmp_path / "evaluators", [frozen, unfrozen])
        digests = EvaluatorRegistry.load(root).frozen_digests()
        assert list(digests) == ["evaluator:parse-and-test"]

    def test_duplicate_id_rejected(self, tmp_path: Path) -> None:
        root = tmp_path / "evaluators"
        root.mkdir()
        body = yaml.safe_dump(make_manifest().model_dump(mode="json"))
        (root / "a.yaml").write_text(body, encoding="utf-8")
        (root / "b.yaml").write_text(body, encoding="utf-8")
        (root / "manifest.yaml").write_text(
            yaml.safe_dump({"evaluators": ["a.yaml", "b.yaml"]}), encoding="utf-8"
        )
        with pytest.raises(InvalidInvocationError, match="duplicate"):
            EvaluatorRegistry.load(root)

    def test_traversal_filename_rejected(self, tmp_path: Path) -> None:
        root = tmp_path / "evaluators"
        root.mkdir()
        (root / "manifest.yaml").write_text(
            yaml.safe_dump({"evaluators": ["../outside.yaml"]}), encoding="utf-8"
        )
        with pytest.raises(SecurityViolationError):
            EvaluatorRegistry.load(root)

    def test_subjective_kind_cannot_claim_invariant_checker(self, tmp_path: Path) -> None:
        judge = make_manifest(
            id="evaluator:style-judge",
            kind="llm-judge",
            command=None,
            roles=[EvaluatorRole.INVARIANT_CHECKER],
            independence=IndependenceLevel.L2,
        )
        root = self.write_registry(tmp_path / "evaluators", [judge])
        with pytest.raises(InvalidInvocationError, match="invariant-checker"):
            EvaluatorRegistry.load(root)

    def test_command_kind_requires_command(self, tmp_path: Path) -> None:
        broken = make_manifest(command=None)
        root = self.write_registry(tmp_path / "evaluators", [broken])
        with pytest.raises(InvalidInvocationError, match="declares no command"):
            EvaluatorRegistry.load(root)

    def test_missing_registry_manifest(self, tmp_path: Path) -> None:
        with pytest.raises(InvalidInvocationError, match="registry manifest"):
            EvaluatorRegistry.load(tmp_path / "nowhere")


class TestFrozenDigests:
    def test_matching_digests_pass(self) -> None:
        verify_frozen_digests({"evaluator:a": "sha256:x"}, {"evaluator:a": "sha256:x"})

    def test_changed_digest_is_security_violation(self) -> None:
        with pytest.raises(SecurityViolationError, match="digest changed"):
            verify_frozen_digests({"evaluator:a": "sha256:x"}, {"evaluator:a": "sha256:y"})

    def test_missing_frozen_evaluator_is_security_violation(self) -> None:
        with pytest.raises(SecurityViolationError, match="missing"):
            verify_frozen_digests({"evaluator:a": "sha256:x"}, {})


RESULT_PAYLOAD = {
    "schema_version": "dev.gauntlet.evaluator-output/v1",
    "passed": True,
    "metrics": [{"metric": "tests-passed", "value": 12.0, "n": 12}],
    "abstained": False,
    "details": "12 tests passed",
}


class TestCommandEvaluator:
    def test_real_script_writes_structured_result(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        worktree = tmp_path / "worktree"
        worktree.mkdir()
        script = worktree / "run_eval.py"
        script.write_text(
            "import json, pathlib\n"
            f"payload = {RESULT_PAYLOAD!r}\n"
            'pathlib.Path(".gauntlet-result.json").write_text(json.dumps(payload))\n',
            encoding="utf-8",
        )
        evaluator = CommandEvaluator(
            make_manifest(), runner=SubprocessRunner(), clock=clock, ids=ids
        )
        outcome = evaluator.run(
            candidate_worktree=worktree,
            candidate_id="candidate:c1",
            split=SplitKind.SEARCH,
        )
        assert outcome.evaluation.passed is True
        assert outcome.evaluation.evaluator_id == "evaluator:parse-and-test"
        assert outcome.evaluation.metrics[0].metric == "tests-passed"
        assert outcome.evaluation.metrics[0].value == 12.0
        expected_digest = digest_bytes((worktree / RESULT_FILENAME).read_bytes())
        assert outcome.raw_output_digest == expected_digest
        assert outcome.parser_id is None

    def test_invalid_result_contract_is_gate_failure(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        worktree = tmp_path / "worktree"
        worktree.mkdir()
        (worktree / "run_eval.py").write_text(
            "import pathlib\n"
            'pathlib.Path(".gauntlet-result.json").write_text(\'{"passed": "yes-ish"}\')\n',
            encoding="utf-8",
        )
        evaluator = CommandEvaluator(
            make_manifest(), runner=SubprocessRunner(), clock=clock, ids=ids
        )
        with pytest.raises(GateFailedError, match="invalid"):
            evaluator.run(
                candidate_worktree=worktree,
                candidate_id="candidate:c1",
                split=SplitKind.SEARCH,
            )

    def test_missing_result_without_parser_is_gate_failure(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        worktree = tmp_path / "worktree"
        worktree.mkdir()
        (worktree / "run_eval.py").write_text("print('logs only')\n", encoding="utf-8")
        evaluator = CommandEvaluator(
            make_manifest(), runner=SubprocessRunner(), clock=clock, ids=ids
        )
        with pytest.raises(GateFailedError, match="no .gauntlet-result.json"):
            evaluator.run(
                candidate_worktree=worktree,
                candidate_id="candidate:c1",
                split=SplitKind.SEARCH,
            )

    def test_legacy_log_parser_retains_raw_log_digest(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        class PytestSummaryParser:
            parser_id = "pytest-summary"
            version = "1.0.0"

            def parse(self, stdout: str, stderr: str, exit_code: int) -> EvaluatorOutputV1:
                return EvaluatorOutputV1(passed=exit_code == 0, details=stdout.strip())

        worktree = tmp_path / "worktree"
        worktree.mkdir()
        (worktree / "run_eval.py").write_text("print('3 passed')\n", encoding="utf-8")
        manifest = make_manifest(output_contract={"format": "legacy-logs/pytest"})
        evaluator = CommandEvaluator(
            manifest,
            runner=SubprocessRunner(),
            clock=clock,
            ids=ids,
            log_parser=PytestSummaryParser(),
        )
        outcome = evaluator.run(
            candidate_worktree=worktree,
            candidate_id="candidate:c1",
            split=SplitKind.SEARCH,
        )
        assert outcome.evaluation.passed is True
        assert outcome.parser_id == "pytest-summary"
        assert outcome.parser_version == "1.0.0"
        expected = digest_bytes(f"{outcome.process.stdout}\n{outcome.process.stderr}".encode())
        assert outcome.raw_output_digest == expected

    def test_legacy_format_without_parser_rejected_at_construction(
        self, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        manifest = make_manifest(output_contract={"format": "legacy-logs/pytest"})
        with pytest.raises(InvalidInvocationError, match="LogParser"):
            CommandEvaluator(manifest, runner=SubprocessRunner(), clock=clock, ids=ids)

    def test_network_deny_env_is_allowlist_only(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        captured: dict[str, str] = {}

        class WritingFakeRunner:
            def run(self, argv, *, cwd=None, env=None, timeout_seconds=300, **_):  # type: ignore[no-untyped-def]
                captured.update(env or {})
                (cwd / RESULT_FILENAME).write_text(json.dumps(RESULT_PAYLOAD))
                return CompletedProcess(argv=tuple(argv), exit_code=0, stdout="", stderr="")

        worktree = tmp_path / "worktree"
        worktree.mkdir()
        manifest = make_manifest(
            command={
                "argv": ["fake-tool"],
                "network": "deny",
                "environment_allowlist": ["KEEP_ME"],
            }
        )
        evaluator = CommandEvaluator(manifest, runner=WritingFakeRunner(), clock=clock, ids=ids)
        evaluator.run(
            candidate_worktree=worktree,
            candidate_id="candidate:c1",
            split=SplitKind.SEARCH,
            base_env={"KEEP_ME": "yes", "SECRET_TOKEN": "nope"},
        )
        assert captured["KEEP_ME"] == "yes"
        assert "SECRET_TOKEN" not in captured
        assert captured["GAUNTLET_NETWORK"] == "deny"

    def test_timeout_is_gate_failure(
        self, tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
    ) -> None:
        class TimeoutRunner:
            def run(self, argv, **_):  # type: ignore[no-untyped-def]
                return CompletedProcess(
                    argv=tuple(argv), exit_code=-1, stdout="", stderr="", timed_out=True
                )

        evaluator = CommandEvaluator(
            make_manifest(), runner=TimeoutRunner(), clock=clock, ids=ids
        )
        with pytest.raises(GateFailedError, match="timed out"):
            evaluator.run(
                candidate_worktree=tmp_path,
                candidate_id="candidate:c1",
                split=SplitKind.SEARCH,
            )


def make_eval(
    ids: SequentialIdGenerator,
    clock: FrozenClock,
    evaluator_id: str,
    passed: bool | None,
) -> EvaluationResultV1:
    return EvaluationResultV1(
        evaluation_id=ids.new_id("evaluation"),
        evaluator_id=evaluator_id,
        evaluator_version="0.1.0",
        candidate_id="candidate:c1",
        split=SplitKind.SEARCH,
        passed=passed,
        started_at=clock.now(),
    )


SPEC_EVALUATORS = SpecEvaluatorsV1(
    hard=["evaluator:h1"],
    deterministic=["evaluator:d1"],
    simulators=["evaluator:s1"],
    learned=["evaluator:l1"],
    llm_judges=["evaluator:j1"],
    human=["evaluator:hu1"],
)


class TestLadder:
    def test_order_is_cheapest_trustworthy_first(self) -> None:
        order = ladder_order(SPEC_EVALUATORS)
        assert [entry.evaluator_id for entry in order] == [
            "evaluator:h1",
            "evaluator:d1",
            "evaluator:s1",
            "evaluator:l1",
            "evaluator:j1",
            "evaluator:hu1",
        ]
        assert order[0].hard and not order[1].hard

    def test_hard_failure_short_circuits(
        self, ids: SequentialIdGenerator, clock: FrozenClock
    ) -> None:
        executed: list[str] = []

        def execute(entry: LadderEntry) -> EvaluationResultV1:
            executed.append(entry.evaluator_id)
            return make_eval(ids, clock, entry.evaluator_id, passed=entry.evaluator_id != (
                "evaluator:h1"
            ))

        result = run_ladder(SPEC_EVALUATORS, execute)
        assert executed == ["evaluator:h1"]
        assert result.short_circuited
        assert result.failed_hard_evaluator == "evaluator:h1"
        assert result.calibration_only_results == ()

    def test_short_circuited_judges_may_still_run_for_calibration(
        self, ids: SequentialIdGenerator, clock: FrozenClock
    ) -> None:
        def execute(entry: LadderEntry) -> EvaluationResultV1:
            return make_eval(ids, clock, entry.evaluator_id, passed=not entry.hard)

        result = run_ladder(SPEC_EVALUATORS, execute, run_subjective_for_calibration=True)
        assert [r.evaluator_id for r in result.results] == ["evaluator:h1"]
        assert len(result.calibration_only_results) == 5
        assert result.short_circuited

    def test_all_pass_runs_everything(
        self, ids: SequentialIdGenerator, clock: FrozenClock
    ) -> None:
        result = run_ladder(
            SPEC_EVALUATORS,
            lambda entry: make_eval(ids, clock, entry.evaluator_id, passed=True),
        )
        assert len(result.results) == 6
        assert not result.short_circuited


def make_dataset(expected: list[str | None]) -> DatasetManifestV1:
    cases = [
        DatasetCaseV1(
            case_id=f"case:cal-{index}",
            digest=DigestRefV1(value=hex_digest(f"cal-{index}")),
            expected=value,  # type: ignore[arg-type]
        )
        for index, value in enumerate(expected)
    ]
    return DatasetManifestV1(
        dataset_id="dataset:calibration", split=SplitKind.CALIBRATION, cases=cases
    )


class TestCalibration:
    def test_accuracy_on_known_outcomes(self) -> None:
        dataset = make_dataset(["good", "bad", "tie", "abstain"])
        verdicts = {
            "case:cal-0": "good",
            "case:cal-1": "bad",
            "case:cal-2": "good",  # wrong: expected tie
            "case:cal-3": "abstain",
        }
        report = calibrate_evaluator(dataset, lambda case: verdicts[case.case_id])  # type: ignore[arg-type,return-value]
        assert report.metric("calibration-accuracy").value == pytest.approx(0.75)
        assert report.metric("calibration-consistency").value == pytest.approx(1.0)
        mismatched = [o for o in report.outcomes if not o.matched]
        assert [o.case_id for o in mismatched] == ["case:cal-2"]

    def test_inconsistent_judge_measured_over_repeats(self) -> None:
        dataset = make_dataset(["good"])
        flip = iter(["good", "bad", "good"])

        report = calibrate_evaluator(dataset, lambda case: next(flip), repeats=3)  # type: ignore[arg-type,return-value]
        assert report.metric("calibration-consistency").value == pytest.approx(0.0)
        assert report.outcomes[0].verdicts == ("good", "bad", "good")

    def test_case_without_expected_outcome_rejected(self) -> None:
        dataset = make_dataset([None])
        with pytest.raises(InvalidInvocationError, match="expected outcome"):
            calibrate_evaluator(dataset, lambda case: "good")

    def test_empty_dataset_rejected(self) -> None:
        dataset = DatasetManifestV1(dataset_id="dataset:empty", split=SplitKind.CALIBRATION)
        with pytest.raises(InvalidInvocationError, match="no calibration cases"):
            calibrate_evaluator(dataset, lambda case: "good")


class TestPairwiseHarness:
    PAIRS = [
        (
            PairwiseItem(label="baseline", text="short"),
            PairwiseItem(label="candidate", text="a longer answer"),
        ),
        (
            PairwiseItem(label="baseline", text="alpha"),
            PairwiseItem(label="candidate", text="beta"),
        ),
        (PairwiseItem(label="baseline", text="x"), PairwiseItem(label="candidate", text="y")),
    ]

    def test_identity_is_blinded_and_seed_recorded(self) -> None:
        seen_texts: list[str] = []

        def judge(first: str, second: str) -> str:
            seen_texts.extend([first, second])
            return "tie"

        report = PairwiseJudgeHarness(judge, seed=7).judge_pairs(self.PAIRS)  # type: ignore[arg-type]
        assert report.seed == 7
        for vote in report.votes:
            assert vote.first_blinded.startswith("item-")
            assert "baseline" not in vote.first_blinded
            assert "candidate" not in vote.second_blinded
        assert all("baseline" not in text and "candidate" not in text for text in seen_texts)

    def test_same_seed_reproduces_exact_votes(self) -> None:
        def judge(first: str, second: str) -> str:
            return "a" if len(first) >= len(second) else "b"

        first = PairwiseJudgeHarness(judge, seed=11).judge_pairs(self.PAIRS)  # type: ignore[arg-type]
        second = PairwiseJudgeHarness(judge, seed=11).judge_pairs(self.PAIRS)  # type: ignore[arg-type]
        assert first == second

    def test_order_biased_judge_is_detected_by_both_order_runs(self) -> None:
        report = PairwiseJudgeHarness(lambda a, b: "a", seed=3).judge_pairs(self.PAIRS)
        assert report.order_sensitivity.value == pytest.approx(1.0)
        assert report.winners == (None, None, None)
        assert len(report.order_disagreements) == 3

    def test_ties_and_abstentions_are_preserved_raw(self) -> None:
        verdicts = iter(["tie", "abstain"] * 3)
        report = PairwiseJudgeHarness(lambda a, b: next(verdicts), seed=5).judge_pairs(self.PAIRS)  # type: ignore[arg-type,return-value]
        assert {v.verdict for v in report.votes} == {"tie", "abstain"}
        assert any(v.abstained for v in report.votes)
        assert report.verbosity_preference is None

    def test_consistent_judge_has_zero_order_sensitivity(self) -> None:
        def judge(first: str, second: str) -> str:
            return "a" if len(first) > len(second) else "b"

        report = PairwiseJudgeHarness(judge, seed=13).judge_pairs(self.PAIRS[:1])  # type: ignore[arg-type]
        assert report.order_sensitivity.value == pytest.approx(0.0)
        assert report.winners == ("candidate",)
        assert report.verbosity_preference is not None
        assert report.verbosity_preference.value == pytest.approx(1.0)


class TestSelfModification:
    def test_default_evaluator_globs_flag_manifest_edits(self) -> None:
        flagged = detect_self_modification(
            make_manifest(), [".gauntlet/evaluators/parse-and-test.yaml", "src/app.py"]
        )
        assert flagged == [".gauntlet/evaluators/parse-and-test.yaml"]

    def test_declared_source_globs_flag_tool_edits(self) -> None:
        manifest = make_manifest(input_contract={"source_globs": ["tools/eval/**"]})
        flagged = detect_self_modification(manifest, ["tools/eval/main.py", "docs/README.md"])
        assert flagged == ["tools/eval/main.py"]

    def test_clean_candidate_passes(self) -> None:
        require_no_self_modification(make_manifest(), ["src/app.py", "tests/test_app.py"])

    def test_self_modifying_candidate_is_gate_failure(self) -> None:
        with pytest.raises(GateFailedError, match="candidate modified evaluator"):
            require_no_self_modification(
                make_manifest(), [".gauntlet/evaluators/parse-and-test.yaml"]
            )

    def test_malformed_source_globs_rejected(self) -> None:
        manifest = make_manifest(input_contract={"source_globs": "not-a-list"})
        with pytest.raises(InvalidInvocationError, match="source_globs"):
            detect_self_modification(manifest, ["src/app.py"])
