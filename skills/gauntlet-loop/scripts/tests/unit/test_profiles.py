"""Domain profiles, evaluator templates, and the visual semantic-mirror fixture.

Validates every bundled representation profile and evaluator template
against the frozen dev.gauntlet/v1 contracts, and exercises the
chirality/attachment invariant on the naive-flip versus chirality-aware
landmark fixtures.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import yaml

from gauntlet.models import EvaluatorManifestV1, RepresentationProfileV1

SKILL_ROOT = Path(__file__).resolve().parents[3]
PROFILES_DIR = SKILL_ROOT / "assets" / "profiles"
TEMPLATES_DIR = SKILL_ROOT / "assets" / "evaluator-templates"
MIRROR_DIR = SKILL_ROOT / "assets" / "examples" / "visual-semantic-mirror"

EXPECTED_PROFILES = {"software", "visual", "research", "agent", "model-training"}
EXPECTED_TEMPLATES = {
    "parse-and-test",
    "build-check",
    "api-compatibility",
    "cross-view-consistency",
    "chirality-attachment-invariant",
    "citation-fidelity",
    "claim-evidence-coverage",
    "tool-schema-check",
    "replay-first-divergence",
    "metric-non-regression",
    "smoke-vs-hypothesis-guard",
}

PROFILE_PATHS = sorted(PROFILES_DIR.glob("*.yaml"))
TEMPLATE_PATHS = sorted(TEMPLATES_DIR.glob("*.yaml"))


def _load_mapping(path: Path) -> dict[str, Any]:
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(loaded, dict), f"{path} must contain a YAML mapping"
    return loaded


class TestProfiles:
    def test_all_expected_profiles_present(self) -> None:
        assert {path.stem for path in PROFILE_PATHS} == EXPECTED_PROFILES

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_validates_as_representation_profile(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        assert profile.profile_id == f"profile:{path.stem}"
        assert profile.nodes, "profile must declare artifact nodes"
        assert profile.transforms, "profile must declare transforms"
        assert profile.evaluator_templates, "profile must declare evaluator templates"

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_reference_guide_exists(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        reference = SKILL_ROOT / profile.reference
        assert reference.is_file(), f"missing reference guide {profile.reference}"

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_evaluator_templates_resolve_to_files(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        for template_name in profile.evaluator_templates:
            template_path = TEMPLATES_DIR / f"{template_name}.yaml"
            assert template_path.is_file(), f"missing template {template_name}"
            manifest = EvaluatorManifestV1.model_validate(_load_mapping(template_path))
            assert manifest.id == f"evaluator:{template_name}"

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_transform_endpoints_are_declared_nodes(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        representations = {node.representation for node in profile.nodes}
        for transform in profile.transforms:
            assert transform.source in representations, transform.edge_id
            assert transform.target in representations, transform.edge_id

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_node_and_edge_ids_unique(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        node_ids = [node.node_id for node in profile.nodes]
        edge_ids = [transform.edge_id for transform in profile.transforms]
        assert len(node_ids) == len(set(node_ids))
        assert len(edge_ids) == len(set(edge_ids))

    @pytest.mark.parametrize("path", PROFILE_PATHS, ids=lambda path: path.stem)
    def test_canonical_nodes_declare_canonical_for(self, path: Path) -> None:
        profile = RepresentationProfileV1.model_validate(_load_mapping(path))
        for node in profile.nodes:
            if node.role.value == "canonical":
                assert node.canonical_for, f"{node.node_id} lacks canonical_for"


class TestEvaluatorTemplates:
    def test_all_expected_templates_present(self) -> None:
        assert {path.stem for path in TEMPLATE_PATHS} == EXPECTED_TEMPLATES

    @pytest.mark.parametrize("path", TEMPLATE_PATHS, ids=lambda path: path.stem)
    def test_validates_as_evaluator_manifest(self, path: Path) -> None:
        manifest = EvaluatorManifestV1.model_validate(_load_mapping(path))
        assert manifest.id == f"evaluator:{path.stem}"
        if manifest.kind == "command":
            assert manifest.command is not None, "command evaluators need a command"
            assert manifest.command.network == "deny"

    def test_parse_and_test_matches_brief_contract(self) -> None:
        manifest = EvaluatorManifestV1.model_validate(
            _load_mapping(TEMPLATES_DIR / "parse-and-test.yaml")
        )
        assert manifest.kind == "command"
        assert [role.value for role in manifest.roles] == ["invariant-checker", "comparator"]
        assert manifest.independence.value == "L4"
        assert manifest.command is not None
        assert manifest.command.argv == ["python", "-m", "pytest", "-q"]
        assert manifest.command.cwd == "candidate-worktree"
        assert manifest.command.timeout_seconds == 300
        assert manifest.command.network == "deny"
        assert manifest.command.environment_allowlist == []
        assert manifest.output_contract == {
            "format": "dev.gauntlet.evaluator-output/v1",
            "result_file": ".gauntlet-result.json",
        }
        assert manifest.cost_class == "bounded-local"
        assert manifest.frozen_for_promotion is True


def _load_ledger() -> dict[str, Any]:
    return _load_mapping(MIRROR_DIR / "entity-ledger.yaml")


def _load_landmarks(name: str) -> dict[str, Any]:
    loaded = json.loads((MIRROR_DIR / name).read_text(encoding="utf-8"))
    assert isinstance(loaded, dict)
    return loaded


def _chirality_violations(ledger: dict[str, Any], view: dict[str, Any]) -> list[str]:
    """Deterministic attachment/handedness invariant from the identity ledger.

    Mirrors what the chirality-attachment-invariant evaluator template
    checks: prop attachment side, declared asymmetry sides, and forbidden
    deriving transforms.
    """
    violations: list[str] = []
    ledger_features = ledger["features"]

    expected_hand = ledger_features["bindle"]["carried_by"]
    actual_hand = view["attachments"]["bindle"]
    if actual_hand != expected_hand:
        violations.append(f"bindle attached to {actual_hand}, ledger requires {expected_hand}")

    expected_side = ledger_features["hair_part"]["semantic_side"]
    actual_side = view["features"]["hair_part"]["semantic_side"]
    if actual_side != expected_side:
        violations.append(f"hair_part on {actual_side}, ledger requires {expected_side}")

    if view["derived_by"] in ledger["forbidden_transforms"]:
        violations.append(f"derived by forbidden transform {view['derived_by']}")

    return violations


class TestVisualSemanticMirrorFixture:
    def test_fixture_files_parse(self) -> None:
        ledger = _load_ledger()
        assert ledger["character_id"] == "bo"
        assert "unqualified_horizontal_pixel_flip" in ledger["forbidden_transforms"]
        for name in ("naive-flip.landmarks.json", "chirality-aware.landmarks.json"):
            view = _load_landmarks(name)
            assert view["character_id"] == "bo"
            assert view["landmarks"]

    def test_views_share_geometry_and_differ_only_in_chirality_fields(self) -> None:
        naive = _load_landmarks("naive-flip.landmarks.json")
        aware = _load_landmarks("chirality-aware.landmarks.json")
        # Identical geometry: a pixel/silhouette comparison cannot separate them.
        assert naive["landmarks"] == aware["landmarks"]
        assert naive["view"] == aware["view"]
        # The difference is exactly the chirality-sensitive semantics.
        assert naive["attachments"]["bindle"] != aware["attachments"]["bindle"]
        assert (
            naive["features"]["hair_part"]["semantic_side"]
            != aware["features"]["hair_part"]["semantic_side"]
        )
        assert naive["derived_by"] != aware["derived_by"]

    def test_naive_flip_fails_chirality_invariant(self) -> None:
        violations = _chirality_violations(
            _load_ledger(), _load_landmarks("naive-flip.landmarks.json")
        )
        assert len(violations) == 3
        assert any("bindle" in violation for violation in violations)
        assert any("hair_part" in violation for violation in violations)
        assert any("forbidden transform" in violation for violation in violations)

    def test_chirality_aware_view_passes_invariant(self) -> None:
        violations = _chirality_violations(
            _load_ledger(), _load_landmarks("chirality-aware.landmarks.json")
        )
        assert violations == []
