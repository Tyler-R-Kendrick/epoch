"""JSON Schema (Draft 2020-12) generation and drift detection.

``gauntlet schema generate`` writes committed schemas into the skill's
``assets/schemas/`` directory; ``gauntlet schema check`` fails when committed
schemas differ from freshly generated ones. ``project init`` copies the
installed set into ``.gauntlet/schemas/`` so historical state stays
self-describing. Released schema versions are never mutated in place.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic.json_schema import GenerateJsonSchema

from gauntlet.canonical_json import digest_bytes
from gauntlet.errors import GateFailedError
from gauntlet.models import PERSISTED_MODELS, GauntletModel
from gauntlet.paths import atomic_write_text

SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"


class _Draft202012Generator(GenerateJsonSchema):
    schema_dialect = SCHEMA_DIALECT


def _schema_id(model: type[GauntletModel]) -> str:
    field = model.model_fields.get("schema_version")
    if field is not None and isinstance(field.default, str):
        default: str = field.default
        return default
    return f"dev.gauntlet.{model.__name__.lower()}/v1"


def schema_filename(model: type[GauntletModel]) -> str:
    return _schema_id(model).replace("dev.gauntlet.", "").replace("/", ".") + ".schema.json"


def generate_schema(model: type[GauntletModel]) -> dict[str, Any]:
    schema = model.model_json_schema(schema_generator=_Draft202012Generator, mode="validation")
    schema["$schema"] = SCHEMA_DIALECT
    schema["$id"] = f"https://schemas.gauntlet.dev/{schema_filename(model)}"
    return schema


def _render(schema: dict[str, Any]) -> str:
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def _all_models() -> tuple[type[GauntletModel], ...]:
    """Persisted contracts from models.py plus module-owned records.

    Module-owned records (defined next to the service that persists them)
    are registered here so schema generation and drift checks cover them
    without creating import cycles in models.py.
    """
    from gauntlet.replay import ReplayRecordV1

    return (*PERSISTED_MODELS, ReplayRecordV1)


def generate_all(target_dir: Path) -> dict[str, str]:
    """Write every persisted model schema; returns filename -> digest."""
    target_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    for model in _all_models():
        filename = schema_filename(model)
        rendered = _render(generate_schema(model))
        atomic_write_text(target_dir / filename, rendered)
        manifest[filename] = digest_bytes(rendered.encode("utf-8"))
    manifest_text = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    atomic_write_text(target_dir / "manifest.json", manifest_text)
    return manifest


def check_drift(committed_dir: Path) -> list[str]:
    """Compare committed schemas to freshly generated ones."""
    problems: list[str] = []
    for model in _all_models():
        filename = schema_filename(model)
        committed = committed_dir / filename
        if not committed.is_file():
            problems.append(f"missing committed schema: {filename}")
            continue
        expected = _render(generate_schema(model))
        actual = committed.read_text(encoding="utf-8")
        if expected != actual:
            problems.append(f"schema drift: {filename}")
    return problems


def require_no_drift(committed_dir: Path) -> None:
    problems = check_drift(committed_dir)
    if problems:
        raise GateFailedError(
            "committed JSON Schemas do not match the models:\n" + "\n".join(problems),
            hint="run `gauntlet schema generate` in a developer context and review the diff",
        )
