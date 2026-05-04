from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from epoch.core import EpochRepository, Event
from epoch.crdt import CRDTRegistry


class EventTests(unittest.TestCase):
    def test_event_id_is_content_addressed(self) -> None:
        event = Event(
            type="record",
            author="alice",
            lamport=1,
            parents=(),
            payload={"path": "README.md"},
            timestamp=1,
        )
        materialized = Event.from_dict(event.to_dict())

        self.assertEqual(materialized.id, materialized.computed_id())


class RepositoryTests(unittest.TestCase):
    def test_record_file_appends_verifiable_event(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "note.txt"
            target.write_text("hello\n", encoding="utf-8")
            repo = EpochRepository(root)
            repo.init("alice")

            event = repo.record_file(target, "text/plain")

            self.assertEqual(repo.heads(), (event.id,))
            self.assertEqual(repo.verify(), [])
            self.assertEqual(repo.read(event.id).payload["path"], "note.txt")

    def test_verify_detects_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "note.txt"
            target.write_text("hello\n", encoding="utf-8")
            repo = EpochRepository(root)
            repo.init("alice")
            event = repo.record_file(target, "text/plain")
            path = root / ".epoch" / "events" / f"{event.id}.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            data["payload"]["size"] = 999
            path.write_text(json.dumps(data), encoding="utf-8")

            self.assertIn("content hash mismatch", "\n".join(repo.verify()))


class CRDTTests(unittest.TestCase):
    def test_text_merge_preserves_concurrent_additions(self) -> None:
        registry = CRDTRegistry.defaults()

        merged = registry.merge("text/plain", "base\n", "base\nleft\n", "base\nright\n")

        self.assertIn("left", merged)
        self.assertIn("right", merged)

    def test_json_merge_combines_independent_keys(self) -> None:
        registry = CRDTRegistry.defaults()

        merged = registry.merge(
            "application/json",
            {"name": "epoch"},
            {"name": "epoch", "left": True},
            {"name": "epoch", "right": True},
        )

        self.assertEqual(merged, {"name": "epoch", "left": True, "right": True})


if __name__ == "__main__":
    unittest.main()
