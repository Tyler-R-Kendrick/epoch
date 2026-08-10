"""Portable immutable control ledger: one JSON document per record.

Tracked ledger records are the Git-portable evidence of accepted decisions;
the ActiveGraph store remains the complete runtime history. Records are
append-only: a correction writes a new record, never rewrites an old one.
Indexes are ignored cache files, never a shared mutable index.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TypeVar

from gauntlet.canonical_json import canonical_bytes, digest_bytes
from gauntlet.errors import InvalidInvocationError, SecurityViolationError
from gauntlet.models import GauntletModel
from gauntlet.paths import atomic_write

RecordT = TypeVar("RecordT", bound=GauntletModel)

_LEDGER_KINDS = (
    "campaigns",
    "experiments",
    "decisions",
    "promotions",
    "releases",
    "incidents",
    "bundles",
)


def _record_filename(record_id: str) -> str:
    """Stable, filesystem-safe filename derived from a stable ID."""
    safe = record_id.replace(":", "__").replace("/", "_")
    if ".." in safe or safe.startswith("."):
        raise SecurityViolationError(f"unsafe ledger record id: {record_id!r}")
    return f"{safe}.json"


class LedgerStore:
    """Filesystem ledger rooted at ``.gauntlet/ledger/``."""

    def __init__(self, ledger_dir: Path) -> None:
        self._root = ledger_dir

    def kind_dir(self, kind: str) -> Path:
        if kind not in _LEDGER_KINDS:
            raise InvalidInvocationError(
                f"unknown ledger kind: {kind!r}", hint=f"expected one of {', '.join(_LEDGER_KINDS)}"
            )
        return self._root / kind

    def append(self, kind: str, record_id: str, record: GauntletModel) -> Path:
        """Write an immutable record; refuses to overwrite a different one."""
        target = self.kind_dir(kind) / _record_filename(record_id)
        payload = record.model_dump(mode="json")
        data = canonical_bytes(payload)
        if target.exists():
            existing = target.read_bytes()
            if digest_bytes(existing) != digest_bytes(data):
                raise SecurityViolationError(
                    f"ledger record already exists with different content: {target.name}",
                    hint="ledger records are immutable; append a new record instead",
                )
            return target
        atomic_write(target, data)
        return target

    def load(self, kind: str, record_id: str, model: type[RecordT]) -> RecordT:
        target = self.kind_dir(kind) / _record_filename(record_id)
        if not target.is_file():
            raise InvalidInvocationError(f"ledger record not found: {kind}/{record_id}")
        return model.model_validate(json.loads(target.read_text(encoding="utf-8")))

    def list_ids(self, kind: str) -> list[str]:
        directory = self.kind_dir(kind)
        if not directory.is_dir():
            return []
        ids = []
        for path in sorted(directory.glob("*.json")):
            ids.append(path.stem.replace("__", ":"))
        return ids

    def load_all(self, kind: str, model: type[RecordT]) -> list[RecordT]:
        directory = self.kind_dir(kind)
        if not directory.is_dir():
            return []
        records = []
        for path in sorted(directory.glob("*.json")):
            records.append(model.model_validate(json.loads(path.read_text(encoding="utf-8"))))
        return records
