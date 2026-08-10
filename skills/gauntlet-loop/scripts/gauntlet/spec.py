"""Specification lifecycle: init, validate, freeze, diff, supersede.

The frozen spec digest covers the complete normative bundle: the spec
document, reference manifest, policies, profiles, evaluator manifests, and
data split manifests. A frozen version is never rewritten in place;
supersede creates a new version through an R4 governance intent.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import yaml

from gauntlet.canonical_json import digest_value
from gauntlet.errors import (
    ApprovalRequiredError,
    GateFailedError,
    InvalidInvocationError,
)
from gauntlet.models import DatasetManifestV1, EvaluatorManifestV1, GauntletSpecV1
from gauntlet.paths import ProjectPaths, atomic_write_text, skill_resource
from gauntlet.support import Clock, SystemClock


class GovernanceGate(Protocol):
    """Injected R4 gate; the CLI wires the real authority service."""

    def require_governance_decision(self, operation: str, detail: str) -> str:
        """Return a decision id or raise ApprovalRequiredError."""
        ...


class FailClosedGovernanceGate:
    def require_governance_decision(self, operation: str, detail: str) -> str:
        raise ApprovalRequiredError(
            f"{operation} requires an R4 governance decision",
            hint=(
                "record a governance approval with `gauntlet intent propose` and "
                "`gauntlet intent approve`, then retry with --governance-decision <id>"
            ),
        )


@dataclass
class SpecValidationReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    promotable: bool = False

    @property
    def ok(self) -> bool:
        return not self.errors

    def to_json(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "warnings": self.warnings,
            "promotable": self.promotable,
        }


def _load_yaml(path: Path) -> Any:
    if not path.is_file():
        raise InvalidInvocationError(f"missing file: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def spec_file(paths: ProjectPaths) -> Path:
    return paths.spec_dir / "gauntlet.yaml"


def load_spec(paths: ProjectPaths) -> GauntletSpecV1:
    return GauntletSpecV1.model_validate(_load_yaml(spec_file(paths)))


def init_spec(paths: ProjectPaths, *, force: bool = False) -> Path:
    """Copy the documented draft spec; never declares it frozen."""
    target = spec_file(paths)
    if target.is_file() and not force:
        raise InvalidInvocationError(
            f"spec already exists: {target}",
            hint="edit it in place, or pass --force to restore the draft template",
        )
    template = skill_resource("assets/project-template/.gauntlet/spec/gauntlet.yaml")
    atomic_write_text(target, template.read_text(encoding="utf-8"))
    return target


def validate_spec(paths: ProjectPaths) -> SpecValidationReport:
    """Schema, cross-reference, evaluator, split, and policy validation."""
    report = SpecValidationReport()
    try:
        spec = load_spec(paths)
    except Exception as error:  # pydantic or YAML errors -> invalid spec
        report.errors.append(f"spec schema: {error}")
        return report

    # Split manifests must exist, parse, and stay disjoint by purpose.
    split_cases: dict[str, set[str]] = {}
    for split_name, manifest_rel in (
        ("search", spec.splits.search_manifest),
        ("calibration", spec.splits.calibration_manifest),
        ("promotion", spec.splits.promotion_manifest),
    ):
        if manifest_rel is None:
            report.errors.append(f"splits.{split_name}_manifest is not set")
            continue
        manifest_path = paths.resolve_project_path(manifest_rel)
        try:
            manifest = DatasetManifestV1.model_validate(_load_yaml(manifest_path))
        except InvalidInvocationError:
            report.errors.append(f"splits.{split_name}_manifest missing: {manifest_rel}")
            continue
        except Exception as error:  # noqa: BLE001
            report.errors.append(f"splits.{split_name}_manifest invalid: {error}")
            continue
        if manifest.split.value != split_name:
            report.errors.append(
                f"splits.{split_name}_manifest declares split={manifest.split.value}"
            )
        split_cases[split_name] = {case.digest.digest for case in manifest.cases}
    for left, right in (("search", "calibration"), ("search", "promotion"), (
        "calibration",
        "promotion",
    )):
        overlap = split_cases.get(left, set()) & split_cases.get(right, set())
        if overlap:
            report.errors.append(
                f"split leakage: {len(overlap)} case digest(s) shared between "
                f"{left} and {right}"
            )

    # Evaluator references must resolve to registered manifests.
    registry_path = paths.evaluators_dir / "manifest.yaml"
    registered: set[str] = set()
    if registry_path.is_file():
        registry = _load_yaml(registry_path) or {}
        for entry in registry.get("evaluators", []) or []:
            if isinstance(entry, dict) and "file" in entry:
                evaluator_path = paths.evaluators_dir / str(entry["file"])
                try:
                    evaluator = EvaluatorManifestV1.model_validate(_load_yaml(evaluator_path))
                    registered.add(evaluator.id)
                except Exception as error:  # noqa: BLE001
                    report.errors.append(f"evaluator manifest invalid: {entry['file']}: {error}")
            elif isinstance(entry, str):
                registered.add(entry)
    declared = (
        set(spec.evaluators.hard)
        | set(spec.evaluators.deterministic)
        | set(spec.evaluators.simulators)
        | set(spec.evaluators.learned)
        | set(spec.evaluators.llm_judges)
        | set(spec.evaluators.human)
    )
    for evaluator_id in sorted(declared - registered):
        report.errors.append(f"evaluator not registered: {evaluator_id}")

    # Effect policy reference must resolve.
    if spec.runtime.effect_policy:
        try:
            _load_yaml(paths.resolve_project_path(spec.runtime.effect_policy))
        except InvalidInvocationError:
            report.errors.append(f"runtime.effect_policy missing: {spec.runtime.effect_policy}")

    # Representation graph: transforms must connect declared nodes.
    node_names = {node.representation for node in spec.representations.nodes}
    for transform in spec.representations.transforms:
        for endpoint in (transform.source, transform.target):
            if endpoint not in node_names:
                report.errors.append(
                    f"transform {transform.edge_id} references unknown "
                    f"representation: {endpoint}"
                )

    # Stop policy must include a hard cap.
    if spec.stop is None or not spec.stop.hard_budget.has_hard_cap():
        report.errors.append("stop.hard_budget must declare at least one hard cap")

    # Promotability: never treat null thresholds as zero or success.
    promotable_problems: list[str] = []
    if spec.promotion.minimum_practical_effect is None:
        promotable_problems.append("promotion.minimum_practical_effect is null")
    if spec.normative.protected_dimensions and not spec.promotion.protected_regression_budgets:
        promotable_problems.append(
            "protected_dimensions declared without protected_regression_budgets"
        )
    if not spec.normative.hard_invariants:
        promotable_problems.append("normative.hard_invariants is empty")
    if not declared:
        promotable_problems.append("no evaluators declared")
    report.promotable = report.ok and not promotable_problems
    report.warnings.extend(f"not promotable: {problem}" for problem in promotable_problems)
    return report


_BUNDLE_MEMBERS: tuple[tuple[str, str], ...] = (
    ("spec", "spec/gauntlet.yaml"),
    ("references", "spec/references.yaml"),
    ("authority-policy", "policies/authority.yaml"),
    ("effect-policy", "policies/effects.yaml"),
    ("promotion-policy", "policies/promotion.yaml"),
    ("evaluation-policy", "policies/evaluation.yaml"),
    ("privacy-policy", "policies/privacy.yaml"),
    ("retention-policy", "policies/retention.yaml"),
    ("profile", "profiles/default.yaml"),
    ("evaluator-registry", "evaluators/manifest.yaml"),
    ("search-split", "datasets/search/manifest.yaml"),
    ("calibration-split", "datasets/calibration/manifest.yaml"),
    ("promotion-split", "datasets/promotion/manifest.yaml"),
)


def bundle_digests(paths: ProjectPaths) -> dict[str, str]:
    """Canonical digests of every normative bundle member."""
    digests: dict[str, str] = {}
    for name, relative in _BUNDLE_MEMBERS:
        member = paths.gauntlet_dir / relative
        if member.is_file():
            digests[name] = digest_value(yaml.safe_load(member.read_text(encoding="utf-8")))
    return digests


def freeze_spec(
    paths: ProjectPaths,
    *,
    clock: Clock | None = None,
) -> dict[str, Any]:
    """Canonicalize and digest the complete spec bundle; emit a record."""
    clock = clock or SystemClock()
    report = validate_spec(paths)
    if not report.ok:
        raise GateFailedError(
            "spec validation failed:\n" + "\n".join(report.errors),
            hint="fix the spec, then run `gauntlet spec validate`",
        )
    spec = load_spec(paths)
    if spec.frozen:
        raise InvalidInvocationError(
            "spec is already frozen",
            hint="use `gauntlet spec supersede` to create a new version",
        )
    digests = bundle_digests(paths)
    frozen_digest = digest_value(digests)
    frozen_at = clock.now()

    record = {
        "schema_version": "dev.gauntlet.frozen-spec/v1",
        "spec_id": spec.spec_id,
        "frozen_digest": frozen_digest,
        "member_digests": digests,
        "frozen_at": frozen_at,
        "promotable": report.promotable,
    }
    digest_hex = frozen_digest.split(":", 1)[1]
    record_path = paths.spec_digests_dir / f"{digest_hex[:16]}.json"
    atomic_write_text(record_path, json.dumps(record, indent=2, sort_keys=True) + "\n")

    updated = spec.model_copy(update={"frozen": True, "frozen_digest": frozen_digest})
    atomic_write_text(
        spec_file(paths),
        yaml.safe_dump(updated.model_dump(mode="json"), sort_keys=False),
    )
    return record


def diff_specs(
    paths: ProjectPaths, old_digest_prefix: str, new_digest_prefix: str
) -> dict[str, Any]:
    """Explain member-level digest changes between two frozen versions."""
    records: dict[str, dict[str, Any]] = {}
    for record_file in paths.spec_digests_dir.glob("*.json"):
        record = json.loads(record_file.read_text(encoding="utf-8"))
        records[record["frozen_digest"]] = record
    old = _find_record(records, old_digest_prefix)
    new = _find_record(records, new_digest_prefix)
    changed = []
    old_members = old["member_digests"]
    new_members = new["member_digests"]
    for name in sorted(set(old_members) | set(new_members)):
        before = old_members.get(name)
        after = new_members.get(name)
        if before != after:
            changed.append({"member": name, "before": before, "after": after})
    return {
        "old": old["frozen_digest"],
        "new": new["frozen_digest"],
        "changed_members": changed,
        "identical": not changed,
    }


def _find_record(records: dict[str, dict[str, Any]], prefix: str) -> dict[str, Any]:
    matches = [
        record
        for digest, record in records.items()
        if digest.startswith(prefix) or digest.split(":", 1)[1].startswith(prefix)
    ]
    if not matches:
        raise InvalidInvocationError(f"no frozen spec record matches: {prefix!r}")
    if len(matches) > 1:
        raise InvalidInvocationError(f"ambiguous frozen spec prefix: {prefix!r}")
    return matches[0]


def supersede_spec(
    paths: ProjectPaths,
    *,
    gate: GovernanceGate,
    governance_decision: str | None,
    clock: Clock | None = None,
) -> dict[str, Any]:
    """Create a new spec version via an R4 governance decision."""
    clock = clock or SystemClock()
    spec = load_spec(paths)
    if not spec.frozen:
        raise InvalidInvocationError(
            "current spec is not frozen; edit and freeze it instead of superseding"
        )
    decision_id = governance_decision or gate.require_governance_decision(
        "change-frozen-spec", f"supersede {spec.spec_id} ({spec.frozen_digest})"
    )
    old_digest = spec.frozen_digest
    assert old_digest is not None  # guaranteed by frozen=True invariant
    suffix = old_digest.split(":", 1)[1][:8]
    superseded = spec.model_copy(
        update={
            "spec_id": f"{spec.spec_id}-superseding-{suffix}",
            "frozen": False,
            "frozen_digest": None,
            "supersedes": spec.spec_id,
        }
    )
    atomic_write_text(
        spec_file(paths),
        yaml.safe_dump(superseded.model_dump(mode="json"), sort_keys=False),
    )
    return {
        "superseded": spec.spec_id,
        "old_digest": old_digest,
        "new_spec_id": superseded.spec_id,
        "governance_decision": decision_id,
        "frozen": False,
        "next_action": "edit the new draft, then `gauntlet spec freeze`",
    }
