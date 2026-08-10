"""Domain profile selection and validation.

Selecting a profile replaces ``.gauntlet/profiles/default.yaml`` with a
selection record, copies the profile's evaluator templates into the project
registry, and merges only the profile's *declared defaults* (target and
protected dimensions) into the draft spec. Profile-generated references are
never normative.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from gauntlet.errors import GateFailedError, InvalidInvocationError
from gauntlet.models import EvaluatorManifestV1, GauntletSpecV1, RepresentationProfileV1
from gauntlet.paths import ProjectPaths, atomic_write_text, skill_resource
from gauntlet.spec import load_spec, spec_file

PROFILE_NAMES = ("software", "visual", "research", "agent", "model-training")


def profile_asset(name: str) -> Path:
    if name not in PROFILE_NAMES:
        raise InvalidInvocationError(
            f"unknown profile: {name!r}", hint=f"known profiles: {', '.join(PROFILE_NAMES)}"
        )
    return skill_resource(f"assets/profiles/{name}.yaml")


def load_profile(name: str) -> RepresentationProfileV1:
    document = yaml.safe_load(profile_asset(name).read_text(encoding="utf-8"))
    return RepresentationProfileV1.model_validate(document)


def list_profiles() -> list[dict[str, str]]:
    entries = []
    for name in PROFILE_NAMES:
        profile = load_profile(name)
        entries.append(
            {
                "name": name,
                "display_name": profile.display_name,
                "description": profile.description,
                "reference": profile.reference,
            }
        )
    return entries


def validate_profile(name: str) -> dict[str, Any]:
    """Validate transforms, roles, templates, and the reference path."""
    profile = load_profile(name)
    problems: list[str] = []
    node_names = {node.representation for node in profile.nodes}
    for transform in profile.transforms:
        for endpoint in (transform.source, transform.target):
            if endpoint not in node_names:
                problems.append(
                    f"transform {transform.edge_id} references unknown representation "
                    f"{endpoint!r}"
                )
    for template in profile.evaluator_templates:
        template_path = skill_resource(f"assets/evaluator-templates/{template}.yaml")
        manifest = EvaluatorManifestV1.model_validate(
            yaml.safe_load(template_path.read_text(encoding="utf-8"))
        )
        if manifest.id != f"evaluator:{template}":
            problems.append(f"template {template} has mismatched id {manifest.id}")
    try:
        skill_resource(profile.reference)
    except InvalidInvocationError:
        problems.append(f"reference missing: {profile.reference}")
    if problems:
        raise GateFailedError(
            f"profile {name} failed validation:\n" + "\n".join(problems)
        )
    return {
        "name": name,
        "nodes": len(profile.nodes),
        "transforms": len(profile.transforms),
        "evaluator_templates": profile.evaluator_templates,
        "ok": True,
    }


def select_profile(paths: ProjectPaths, name: str) -> dict[str, Any]:
    """Install a profile: selection record, templates, declared defaults."""
    validate_profile(name)
    profile = load_profile(name)

    spec = load_spec(paths)
    if spec.frozen:
        raise InvalidInvocationError(
            "cannot select a profile while the spec is frozen",
            hint="supersede the spec first (`gauntlet spec supersede`)",
        )

    selection = {
        "schema_version": "dev.gauntlet.profile-selection/v1",
        "profile": name,
        "source": "bundled",
    }
    atomic_write_text(
        paths.profiles_dir / "default.yaml",
        yaml.safe_dump(selection, sort_keys=False),
    )

    copied_templates: list[str] = []
    registry_path = paths.evaluators_dir / "manifest.yaml"
    registry = yaml.safe_load(registry_path.read_text(encoding="utf-8")) or {}
    entries = list(registry.get("evaluators") or [])
    known_files = {entry.get("file") for entry in entries if isinstance(entry, dict)}
    for template in profile.evaluator_templates:
        source = skill_resource(f"assets/evaluator-templates/{template}.yaml")
        target_name = f"{template}.yaml"
        target = paths.evaluators_dir / target_name
        if not target.exists():
            atomic_write_text(target, source.read_text(encoding="utf-8"))
            copied_templates.append(target_name)
        if target_name not in known_files:
            entries.append({"file": target_name})
    registry["evaluators"] = entries
    atomic_write_text(registry_path, yaml.safe_dump(registry, sort_keys=False))

    # Merge only declared defaults into the draft spec; never overwrite
    # dimensions the user already declared.
    merged: dict[str, list[str]] = {}
    normative = spec.normative
    if not normative.target_dimensions and profile.default_target_dimensions:
        normative = normative.model_copy(
            update={"target_dimensions": list(profile.default_target_dimensions)}
        )
        merged["target_dimensions"] = list(profile.default_target_dimensions)
    if not normative.protected_dimensions and profile.default_protected_dimensions:
        normative = normative.model_copy(
            update={"protected_dimensions": list(profile.default_protected_dimensions)}
        )
        merged["protected_dimensions"] = list(profile.default_protected_dimensions)
    if merged:
        updated = spec.model_copy(update={"normative": normative})
        GauntletSpecV1.model_validate(updated.model_dump(mode="json"))
        atomic_write_text(
            spec_file(paths),
            yaml.safe_dump(updated.model_dump(mode="json"), sort_keys=False),
        )

    return {
        "selected": name,
        "reference": profile.reference,
        "copied_templates": copied_templates,
        "merged_defaults": merged,
        "next_action": f"load {profile.reference}, then `gauntlet spec validate`",
    }


def show_profile(name: str) -> dict[str, Any]:
    profile = load_profile(name)
    return {
        "name": name,
        "display_name": profile.display_name,
        "description": profile.description,
        "reference": profile.reference,
        "nodes": [
            {"representation": node.representation, "role": node.role.value}
            for node in profile.nodes
        ],
        "transforms": [
            {"edge": edge.edge_id, "source": edge.source, "target": edge.target}
            for edge in profile.transforms
        ],
        "evaluator_templates": profile.evaluator_templates,
        "default_target_dimensions": profile.default_target_dimensions,
        "default_protected_dimensions": profile.default_protected_dimensions,
    }
