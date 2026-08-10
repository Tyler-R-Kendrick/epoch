"""Content-addressed artifact store: dedup, verification, safety, staging."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from gauntlet.artifacts import ArtifactStore
from gauntlet.errors import InvalidInvocationError, SecurityViolationError
from gauntlet.models import ArtifactStoreConfigV1
from gauntlet.support import FrozenClock, SequentialIdGenerator


@pytest.fixture()
def store(tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator) -> ArtifactStore:
    return ArtifactStore(
        tmp_path / "artifacts",
        config=ArtifactStoreConfigV1(),
        clock=clock,
        ids=ids,
    )


def test_put_bytes_deduplicates_identical_content(store: ArtifactStore) -> None:
    first = store.put_bytes(b"hello artifact")
    second = store.put_bytes(b"hello artifact")

    assert first.artifact.digest.value == second.artifact.digest.value
    assert first.artifact.artifact_id == second.artifact.artifact_id
    blob_files = list(store.blobs_dir.rglob("*"))
    assert len([path for path in blob_files if path.is_file()]) == 1


def test_blob_layout_uses_sha256_prefix_directories(store: ArtifactStore) -> None:
    manifest = store.put_bytes(b"layout probe")
    hex_digest = manifest.artifact.digest.value
    expected = store.blobs_dir / "sha256" / hex_digest[:2] / hex_digest[2:]
    assert expected.is_file()


def test_get_bytes_verifies_digest_on_read(store: ArtifactStore) -> None:
    manifest = store.put_bytes(b"verify me")
    digest = manifest.artifact.digest.digest
    hex_digest = manifest.artifact.digest.value
    blob_path = store.blobs_dir / "sha256" / hex_digest[:2] / hex_digest[2:]
    blob_path.write_bytes(b"tampered!")

    with pytest.raises(SecurityViolationError):
        store.get_bytes(digest)


def test_size_limit_is_enforced(
    tmp_path: Path, clock: FrozenClock, ids: SequentialIdGenerator
) -> None:
    store = ArtifactStore(
        tmp_path / "artifacts",
        config=ArtifactStoreConfigV1(max_blob_bytes=8),
        clock=clock,
        ids=ids,
    )
    with pytest.raises(InvalidInvocationError):
        store.put_bytes(b"way too large for the limit")


def test_symlink_source_is_rejected(store: ArtifactStore, tmp_path: Path) -> None:
    real = tmp_path / "real.txt"
    real.write_bytes(b"real content")
    link = tmp_path / "link.txt"
    link.symlink_to(real)

    with pytest.raises(SecurityViolationError):
        store.put_file(link)


def test_hardlinked_source_is_rejected(store: ArtifactStore, tmp_path: Path) -> None:
    real = tmp_path / "real.txt"
    real.write_bytes(b"real content")
    hard = tmp_path / "hard.txt"
    os.link(real, hard)

    with pytest.raises(SecurityViolationError):
        store.put_file(hard)


def test_injected_write_failure_leaves_no_partial_blob(
    store: ArtifactStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(fd: int) -> None:
        raise OSError("injected fsync failure")

    monkeypatch.setattr("gauntlet.paths.os.fsync", boom)
    with pytest.raises(OSError, match="injected"):
        store.put_bytes(b"never fully written")

    leftovers = [path for path in store.blobs_dir.rglob("*") if path.is_file()]
    assert leftovers == []


def test_staging_dirs_are_intent_and_content_scoped(store: ArtifactStore) -> None:
    staged = store.staging_dir("intent-000001", "abc123def")
    assert staged.is_dir()
    assert staged == store.staging_root / "intent-000001" / "abc123def"


@pytest.mark.parametrize("bad", ["../escape", "a/b", ".hidden", "", "intent 1"])
def test_staging_rejects_unsafe_scope_segments(store: ArtifactStore, bad: str) -> None:
    with pytest.raises(SecurityViolationError):
        store.staging_dir(bad, "content")
    with pytest.raises(SecurityViolationError):
        store.staging_dir("intent-1", bad)


def test_manifest_is_immutable_and_reloadable(store: ArtifactStore) -> None:
    manifest = store.put_bytes(b"manifest probe", media_type="text/plain")
    loaded = store.get_manifest(manifest.artifact.digest.digest)
    assert loaded == manifest
    assert loaded.artifact.digest.media_type == "text/plain"
