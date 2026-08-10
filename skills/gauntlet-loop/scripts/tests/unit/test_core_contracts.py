"""Foundation contracts: canonical JSON, digests, redaction, ledger, paths."""

from __future__ import annotations

import threading
from pathlib import Path

import pytest

from gauntlet.canonical_json import (
    canonical_bytes,
    digest_bytes,
    digest_value,
    parse_digest,
)
from gauntlet.errors import (
    ConflictError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.ledger import LedgerStore
from gauntlet.locking import project_lock
from gauntlet.models import PERSISTED_MODELS, BudgetV1, CampaignV1, GitRefV1, StopPolicyV1
from gauntlet.paths import ProjectPaths, atomic_write_text
from gauntlet.redaction import REDACTED, Redactor
from gauntlet.schemas import check_drift, generate_all


class TestCanonicalJson:
    def test_deterministic_ordering(self) -> None:
        assert canonical_bytes({"b": 1, "a": 2}) == canonical_bytes({"a": 2, "b": 1})

    def test_digest_shape(self) -> None:
        digest = digest_value({"x": [1, 2.5, "z"]})
        algorithm, value = parse_digest(digest)
        assert algorithm == "sha256"
        assert len(value) == 64

    def test_parse_digest_rejects_malformed(self) -> None:
        with pytest.raises(InvalidInvocationError):
            parse_digest("md5:abc")
        with pytest.raises(InvalidInvocationError):
            parse_digest("sha256:not-hex")
        with pytest.raises(InvalidInvocationError):
            parse_digest("nocolon")

    def test_non_serializable_rejected(self) -> None:
        with pytest.raises(InvalidInvocationError):
            canonical_bytes({"fn": object()})


class TestRedaction:
    def test_private_key_block_redacted(self) -> None:
        text = "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----"
        redacted, report = Redactor().redact_text(text)
        assert REDACTED in redacted
        assert "BEGIN RSA" not in redacted
        assert report

    def test_sensitive_keys_redacted_recursively(self) -> None:
        value = {"api_key": "supersecretvalue", "nested": [{"password": "hunter2"}]}
        redacted, report = Redactor().redact_value(value)
        assert redacted["api_key"] == REDACTED
        assert redacted["nested"][0]["password"] == REDACTED
        assert len(report) == 2

    def test_configured_patterns(self) -> None:
        redactor = Redactor(extra_patterns=[r"internal-[0-9]+"])
        redacted, report = redactor.redact_text("id internal-12345 leaked")
        assert "internal-12345" not in redacted
        assert report == ["configured-pattern-0:1"]

    def test_bearer_token_redacted(self) -> None:
        redacted, _ = Redactor().redact_text("Authorization: Bearer abcdef0123456789TOKEN")
        assert "TOKEN" not in redacted


class TestLedger:
    def _campaign(self, ids: object, clock: object) -> CampaignV1:
        return CampaignV1(
            campaign_id="campaign:demo",
            objective="fix the defect",
            spec_digest=digest_value({"spec": 1}),
            baseline=GitRefV1(branch="main", commit="a" * 40),
            target_branch="main",
            budget=BudgetV1(max_experiments=3),
            stop_policy=StopPolicyV1(hard_budget=BudgetV1(max_experiments=3)),
            created_at="2026-01-01T00:00:00Z",
        )

    def test_append_and_load_round_trip(self, tmp_path: Path, ids: object, clock: object) -> None:
        store = LedgerStore(tmp_path / "ledger")
        record = self._campaign(ids, clock)
        store.append("campaigns", record.campaign_id, record)
        loaded = store.load("campaigns", record.campaign_id, CampaignV1)
        assert loaded == record
        assert store.list_ids("campaigns") == ["campaign:demo"]

    def test_identical_append_is_idempotent(
        self, tmp_path: Path, ids: object, clock: object
    ) -> None:
        store = LedgerStore(tmp_path / "ledger")
        record = self._campaign(ids, clock)
        store.append("campaigns", record.campaign_id, record)
        store.append("campaigns", record.campaign_id, record)

    def test_divergent_rewrite_rejected(self, tmp_path: Path, ids: object, clock: object) -> None:
        store = LedgerStore(tmp_path / "ledger")
        record = self._campaign(ids, clock)
        store.append("campaigns", record.campaign_id, record)
        changed = record.model_copy(update={"objective": "different objective"})
        with pytest.raises(SecurityViolationError):
            store.append("campaigns", record.campaign_id, changed)

    def test_unknown_kind_rejected(self, tmp_path: Path) -> None:
        store = LedgerStore(tmp_path / "ledger")
        with pytest.raises(InvalidInvocationError):
            store.kind_dir("not-a-kind")

    def test_unsafe_record_id_rejected(self, tmp_path: Path, ids: object, clock: object) -> None:
        store = LedgerStore(tmp_path / "ledger")
        record = self._campaign(ids, clock)
        with pytest.raises(SecurityViolationError):
            store.append("campaigns", "..:escape", record)


class TestPaths:
    def test_project_path_escape_rejected(self, tmp_path: Path) -> None:
        paths = ProjectPaths(git_root=tmp_path)
        paths.gauntlet_dir.mkdir()
        with pytest.raises(SecurityViolationError):
            paths.resolve_project_path("../outside.txt")
        with pytest.raises(SecurityViolationError):
            paths.resolve_project_path("/etc/passwd")

    def test_atomic_write_no_partial_file(self, tmp_path: Path) -> None:
        target = tmp_path / "nested" / "file.txt"
        atomic_write_text(target, "hello")
        assert target.read_text(encoding="utf-8") == "hello"
        assert not list(tmp_path.glob("**/.file.txt.tmp-*"))

    def test_worktree_root_outside_repo(self, tmp_path: Path) -> None:
        repo = tmp_path / "repo"
        repo.mkdir()
        paths = ProjectPaths(git_root=repo)
        root = paths.worktree_root()
        assert not str(root).startswith(str(repo))
        assert root.parent == tmp_path


class TestLocking:
    def test_lock_serializes_and_times_out(self, tmp_path: Path) -> None:
        acquired = threading.Event()
        release = threading.Event()

        def hold() -> None:
            with project_lock(tmp_path, timeout_seconds=5):
                acquired.set()
                release.wait(timeout=10)

        thread = threading.Thread(target=hold)
        thread.start()
        assert acquired.wait(timeout=5)
        with pytest.raises(ConflictError), project_lock(tmp_path, timeout_seconds=0):
            pass
        release.set()
        thread.join(timeout=10)
        with project_lock(tmp_path, timeout_seconds=5):
            pass


class TestSchemas:
    def test_generate_then_check_no_drift(self, tmp_path: Path) -> None:
        manifest = generate_all(tmp_path / "schemas")
        # models.PERSISTED_MODELS plus module-owned records (ReplayRecordV1).
        assert len(manifest) >= len(PERSISTED_MODELS) + 1
        assert check_drift(tmp_path / "schemas") == []

    def test_drift_detected(self, tmp_path: Path) -> None:
        target = tmp_path / "schemas"
        generate_all(target)
        victim = next(iter(sorted(target.glob("*.schema.json"))))
        victim.write_text("{}", encoding="utf-8")
        drift = check_drift(target)
        assert any("drift" in problem for problem in drift)

    def test_committed_schemas_match_models(self) -> None:
        committed = Path(__file__).resolve().parents[3] / "assets" / "schemas"
        assert check_drift(committed) == []

    def test_digest_bytes_stable(self) -> None:
        assert digest_bytes(b"abc") == digest_bytes(b"abc")
