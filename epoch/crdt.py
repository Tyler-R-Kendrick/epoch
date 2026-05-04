"""Pluggable CRDT merge definitions used by the Epoch prototype."""

from __future__ import annotations

from collections.abc import Callable
import json
from typing import Any, Protocol

from .core import canonical_json


class CRDTDefinition(Protocol):
    entity_type: str

    def merge(self, base: Any, left: Any, right: Any) -> Any:
        ...


class TextWeaveCRDT:
    """Deterministic line-oriented weave inspired by sequence CRDTs."""

    entity_type = "text/plain"

    def merge(self, base: str, left: str, right: str) -> str:
        if left == right:
            return left
        if left == base:
            return right
        if right == base:
            return left

        base_lines = base.splitlines()
        left_lines = left.splitlines()
        right_lines = right.splitlines()
        merged: list[str] = []

        def add_once(line: str) -> None:
            if line not in merged:
                merged.append(line)

        for line in base_lines:
            if line in left_lines or line in right_lines:
                add_once(line)

        additions = [line for line in left_lines + right_lines if line not in base_lines]
        for line in sorted(dict.fromkeys(additions)):
            add_once(line)

        return "\n".join(merged) + ("\n" if left.endswith("\n") or right.endswith("\n") else "")


class JsonMapCRDT:
    """Recursive deterministic map merge for JSON objects."""

    entity_type = "application/json"

    def merge(self, base: Any, left: Any, right: Any) -> Any:
        return self._merge_value(base, left, right)

    def _merge_value(self, base: Any, left: Any, right: Any) -> Any:
        if left == right:
            return left
        if left == base:
            return right
        if right == base:
            return left
        if isinstance(base, dict) and isinstance(left, dict) and isinstance(right, dict):
            return self._merge_dict(base, left, right)
        if isinstance(left, dict) and isinstance(right, dict):
            return self._merge_dict({}, left, right)
        return min((left, right), key=canonical_json)

    def _merge_dict(self, base: dict[str, Any], left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for key in sorted(set(base) | set(left) | set(right)):
            missing = object()
            base_value = base.get(key, missing)
            left_value = left.get(key, missing)
            right_value = right.get(key, missing)
            if left_value is missing:
                if right_value != base_value:
                    merged[key] = right_value
            elif right_value is missing:
                if left_value != base_value:
                    merged[key] = left_value
            elif base_value is missing:
                merged[key] = self._merge_value(None, left_value, right_value)
            else:
                merged[key] = self._merge_value(base_value, left_value, right_value)
        return merged


class CRDTRegistry:
    """Registry of entity type to merge implementation."""

    def __init__(self) -> None:
        self._definitions: dict[str, CRDTDefinition] = {}

    @classmethod
    def defaults(cls) -> "CRDTRegistry":
        registry = cls()
        registry.register(TextWeaveCRDT())
        registry.register(JsonMapCRDT())
        return registry

    def register(self, definition: CRDTDefinition) -> None:
        self._definitions[definition.entity_type] = definition

    def merge(self, entity_type: str, base: Any, left: Any, right: Any) -> Any:
        definition = self._definitions.get(entity_type)
        if definition is None:
            return three_way_merge(base, left, right)
        return definition.merge(base, left, right)


def three_way_merge(base: Any, left: Any, right: Any) -> Any:
    if left == right:
        return left
    if left == base:
        return right
    if right == base:
        return left
    return min((left, right), key=canonical_json)


def load_entity(entity_type: str, text: str) -> Any:
    if entity_type == "application/json":
        return json.loads(text)
    return text


def dump_entity(entity_type: str, value: Any) -> str:
    if entity_type == "application/json":
        return json.dumps(value, indent=2, sort_keys=True) + "\n"
    return str(value)
