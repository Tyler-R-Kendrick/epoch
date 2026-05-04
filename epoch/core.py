"""Core event log and repository primitives for Epoch."""

from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
from pathlib import Path
import time
from typing import Any


def canonical_json(value: Any) -> str:
    """Return deterministic JSON used for content addressing."""

    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def content_hash(value: Any) -> str:
    return sha256(canonical_json(value).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Event:
    """An immutable, content-addressed Epoch event."""

    type: str
    author: str
    lamport: int
    parents: tuple[str, ...] = field(default_factory=tuple)
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: int = field(default_factory=lambda: int(time.time()))
    id: str | None = None

    def unsigned(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "author": self.author,
            "lamport": self.lamport,
            "parents": list(self.parents),
            "payload": self.payload,
            "timestamp": self.timestamp,
        }

    def computed_id(self) -> str:
        return content_hash(self.unsigned())

    def to_dict(self) -> dict[str, Any]:
        event_id = self.id or self.computed_id()
        return {**self.unsigned(), "id": event_id}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Event":
        return cls(
            type=data["type"],
            author=data["author"],
            lamport=int(data["lamport"]),
            parents=tuple(data.get("parents", [])),
            payload=dict(data.get("payload", {})),
            timestamp=int(data["timestamp"]),
            id=data.get("id"),
        )


class EpochRepository:
    """Filesystem-backed append-only event repository."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        self.epoch_dir = self.root / ".epoch"
        self.events_dir = self.epoch_dir / "events"
        self.heads_file = self.epoch_dir / "heads.json"
        self.identity_file = self.epoch_dir / "identity.json"

    def init(self, author: str = "local") -> None:
        self.events_dir.mkdir(parents=True, exist_ok=True)
        if not self.heads_file.exists():
            self.heads_file.write_text("[]\n", encoding="utf-8")
        if not self.identity_file.exists():
            self.identity_file.write_text(
                canonical_json({"author": author}) + "\n",
                encoding="utf-8",
            )

    def is_initialized(self) -> bool:
        return self.events_dir.is_dir() and self.heads_file.is_file()

    def _require_initialized(self) -> None:
        if not self.is_initialized():
            raise RuntimeError(f"not an Epoch repository: {self.root}")

    def identity(self) -> str:
        self._require_initialized()
        return json.loads(self.identity_file.read_text(encoding="utf-8"))["author"]

    def heads(self) -> tuple[str, ...]:
        self._require_initialized()
        return tuple(json.loads(self.heads_file.read_text(encoding="utf-8")))

    def _write_heads(self, heads: tuple[str, ...]) -> None:
        self.heads_file.write_text(canonical_json(list(heads)) + "\n", encoding="utf-8")

    def next_lamport(self) -> int:
        max_lamport = 0
        for event_id in self.heads():
            max_lamport = max(max_lamport, self.read(event_id).lamport)
        return max_lamport + 1

    def append(self, event_type: str, payload: dict[str, Any], author: str | None = None) -> Event:
        self._require_initialized()
        event = Event(
            type=event_type,
            author=author or self.identity(),
            lamport=self.next_lamport(),
            parents=self.heads(),
            payload=payload,
        )
        event = Event.from_dict(event.to_dict())
        self.events_dir.joinpath(f"{event.id}.json").write_text(
            canonical_json(event.to_dict()) + "\n",
            encoding="utf-8",
        )
        self._write_heads((event.id,))
        return event

    def read(self, event_id: str) -> Event:
        self._require_initialized()
        path = self.events_dir / f"{event_id}.json"
        if not path.is_file():
            raise KeyError(f"unknown event: {event_id}")
        return Event.from_dict(json.loads(path.read_text(encoding="utf-8")))

    def iter_events(self) -> list[Event]:
        self._require_initialized()
        events = [
            Event.from_dict(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted(self.events_dir.glob("*.json"))
        ]
        return sorted(events, key=lambda event: (event.lamport, event.id or ""))

    def verify(self) -> list[str]:
        self._require_initialized()
        errors: list[str] = []
        known: dict[str, Event] = {}
        for event in self.iter_events():
            if event.id != event.computed_id():
                errors.append(f"{event.id}: content hash mismatch")
            known[event.id or ""] = event
        for event in known.values():
            for parent in event.parents:
                parent_event = known.get(parent)
                if parent_event is None:
                    errors.append(f"{event.id}: missing parent {parent}")
                elif event.lamport <= parent_event.lamport:
                    errors.append(f"{event.id}: lamport clock not greater than parent {parent}")
        for head in self.heads():
            if head not in known:
                errors.append(f"head references missing event {head}")
        return errors

    def record_file(self, path: str | Path, entity_type: str | None = None) -> Event:
        source = Path(path)
        if not source.is_absolute():
            source = self.root / source
        relative = source.relative_to(self.root)
        data = source.read_bytes()
        payload = {
            "path": str(relative),
            "entity_type": entity_type or "application/octet-stream",
            "blob_sha256": sha256(data).hexdigest(),
            "size": len(data),
        }
        return self.append("record", payload)
