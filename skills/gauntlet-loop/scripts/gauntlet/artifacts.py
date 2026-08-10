"""Local content-addressed artifact store under ``.gauntlet/artifacts/``.

Layout::

    artifacts/
      blobs/sha256/<first-2-hex>/<remaining-62-hex>      raw content, immutable
      manifests/sha256/<first-2-hex>/<remaining-62-hex>.json
      staging/<intent-scope>/<content-scope>/            uncommitted effect staging

Rules enforced here:

- identity is always the SHA-256 digest of the stored bytes; the caller's
  filename and declared media type are metadata recorded in the manifest and
  are never trusted for identity or dispatch (nothing is sniffed);
- writes are atomic (temp file + rename via :func:`gauntlet.paths.atomic_write`)
  so a crash never leaves a partial blob addressable;
- duplicate content is eliminated: re-storing identical bytes returns the
  existing manifest;
- source files that are symlinks or have a hardlink count above one are
  rejected, because a link can be swapped between digest computation and the
  copy, silently binding a manifest to attacker-controlled content;
- blobs are verified against their digest on every read;
- manifests are immutable JSON documents (divergent rewrite is a security
  violation); large payloads never travel through graph events -- only
  manifests and digest references do.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Literal

from pydantic import Field

from gauntlet.canonical_json import canonical_bytes, digest_bytes, parse_digest, sha256_hex
from gauntlet.constants import ArtifactRole
from gauntlet.errors import (
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.models import (
    ArtifactRefV1,
    ArtifactStoreConfigV1,
    DigestRefV1,
    GauntletModel,
    NonEmptyStr,
    StableId,
    UtcTimestamp,
)
from gauntlet.paths import atomic_write
from gauntlet.support import Clock, IdGenerator

_SCOPE_SEGMENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


class ArtifactManifestV1(GauntletModel):
    """Immutable metadata document stored next to a blob.

    The manifest carries the declared (untrusted) media type and logical
    name, plus provenance and parent-transform references. It is keyed by
    the blob digest: one manifest per unique content.
    """

    schema_version: Literal["dev.gauntlet.artifact-manifest/v1"] = (
        "dev.gauntlet.artifact-manifest/v1"
    )
    artifact: ArtifactRefV1
    created_at: UtcTimestamp
    provenance_record: StableId | None = None
    parent_transforms: list[NonEmptyStr] = Field(default_factory=list)
    source_note: str | None = None
    external_uris: list[NonEmptyStr] = Field(default_factory=list)


class ArtifactStore:
    """Content-addressed blob + manifest store rooted at one directory."""

    def __init__(
        self,
        artifacts_dir: Path,
        *,
        config: ArtifactStoreConfigV1,
        clock: Clock,
        ids: IdGenerator,
    ) -> None:
        self._root = artifacts_dir
        self._config = config
        self._clock = clock
        self._ids = ids

    @property
    def blobs_dir(self) -> Path:
        return self._root / "blobs"

    @property
    def manifests_dir(self) -> Path:
        return self._root / "manifests"

    @property
    def staging_root(self) -> Path:
        return self._root / "staging"

    # -- pathing ------------------------------------------------------------

    def _blob_path(self, hex_digest: str) -> Path:
        return self.blobs_dir / "sha256" / hex_digest[:2] / hex_digest[2:]

    def _manifest_path(self, hex_digest: str) -> Path:
        return self.manifests_dir / "sha256" / hex_digest[:2] / f"{hex_digest[2:]}.json"

    # -- writing ------------------------------------------------------------

    def put_bytes(
        self,
        data: bytes,
        *,
        role: ArtifactRole = ArtifactRole.OBSERVATIONAL,
        media_type: str | None = None,
        logical_name: str | None = None,
        representation: str | None = None,
        provenance_record: str | None = None,
        parent_transforms: list[str] | None = None,
        source_note: str | None = None,
        external_uris: list[str] | None = None,
    ) -> ArtifactManifestV1:
        """Store bytes; return the (possibly pre-existing) manifest."""
        if len(data) > self._config.max_blob_bytes:
            raise InvalidInvocationError(
                f"blob of {len(data)} bytes exceeds the configured "
                f"max_blob_bytes={self._config.max_blob_bytes}",
                hint="raise artifacts.max_blob_bytes in .gauntlet/config.yaml if intentional",
            )
        hex_digest = sha256_hex(data)
        blob_path = self._blob_path(hex_digest)
        manifest_path = self._manifest_path(hex_digest)
        if blob_path.is_file() and manifest_path.is_file():
            return self._load_manifest(manifest_path)
        atomic_write(blob_path, data)
        manifest = ArtifactManifestV1(
            artifact=ArtifactRefV1(
                artifact_id=self._ids.new_id("artifact"),
                role=role,
                digest=DigestRefV1(
                    value=hex_digest,
                    media_type=media_type,
                    byte_size=len(data),
                    storage_uris=list(external_uris or []),
                ),
                representation=representation,
                logical_name=logical_name,
            ),
            created_at=self._clock.now(),
            provenance_record=provenance_record,
            parent_transforms=list(parent_transforms or []),
            source_note=source_note,
            external_uris=list(external_uris or []),
        )
        payload = canonical_bytes(manifest.model_dump(mode="json"))
        if manifest_path.exists():
            existing = manifest_path.read_bytes()
            if digest_bytes(existing) != digest_bytes(payload):
                # Same content digest but divergent metadata: keep the first
                # manifest, it is immutable by contract.
                return self._load_manifest(manifest_path)
        atomic_write(manifest_path, payload)
        return manifest

    def put_file(
        self,
        source: Path,
        *,
        role: ArtifactRole = ArtifactRole.OBSERVATIONAL,
        media_type: str | None = None,
        logical_name: str | None = None,
        representation: str | None = None,
        provenance_record: str | None = None,
        parent_transforms: list[str] | None = None,
        source_note: str | None = None,
        external_uris: list[str] | None = None,
    ) -> ArtifactManifestV1:
        """Store a file's bytes after rejecting symlinks and hardlinks."""
        if source.is_symlink():
            raise SecurityViolationError(
                f"refusing to ingest symlink: {source}",
                hint="copy the real file content; symlinks can be retargeted after hashing",
            )
        if not source.is_file():
            raise InvalidInvocationError(f"not a regular file: {source}")
        if source.stat().st_nlink > 1:
            raise SecurityViolationError(
                f"refusing to ingest hardlinked file (st_nlink > 1): {source}",
                hint="hardlinked content can be mutated through another directory entry",
            )
        return self.put_bytes(
            source.read_bytes(),
            role=role,
            media_type=media_type,
            logical_name=logical_name or source.name,
            representation=representation,
            provenance_record=provenance_record,
            parent_transforms=parent_transforms,
            source_note=source_note,
            external_uris=external_uris,
        )

    def store_raw(self, data: bytes, media_type: str | None = None) -> DigestRefV1:
        """Narrow raw-payload sink used by trace ingestion (observational)."""
        manifest = self.put_bytes(data, role=ArtifactRole.OBSERVATIONAL, media_type=media_type)
        return manifest.artifact.digest

    # -- reading ------------------------------------------------------------

    def get_bytes(self, digest: str) -> bytes:
        """Read a blob and verify its content against the digest."""
        _, hex_digest = parse_digest(digest)
        blob_path = self._blob_path(hex_digest)
        if not blob_path.is_file():
            raise InvalidInvocationError(f"blob not found: {digest}")
        data = blob_path.read_bytes()
        if sha256_hex(data) != hex_digest:
            raise SecurityViolationError(
                f"blob content does not match its digest: {digest}",
                hint="the artifact store has been tampered with or corrupted",
            )
        return data

    def get_manifest(self, digest: str) -> ArtifactManifestV1:
        _, hex_digest = parse_digest(digest)
        manifest_path = self._manifest_path(hex_digest)
        if not manifest_path.is_file():
            raise InvalidInvocationError(f"artifact manifest not found: {digest}")
        return self._load_manifest(manifest_path)

    def has(self, digest: str) -> bool:
        _, hex_digest = parse_digest(digest)
        return self._blob_path(hex_digest).is_file()

    @staticmethod
    def _load_manifest(path: Path) -> ArtifactManifestV1:
        return ArtifactManifestV1.model_validate(json.loads(path.read_text(encoding="utf-8")))

    # -- staging ------------------------------------------------------------

    def staging_dir(self, intent_scope: str, content_scope: str) -> Path:
        """Create (if needed) a staging directory scoped by intent and content.

        Both scope segments must be plain path-safe tokens; anything that
        could traverse (``..``, separators, absolute paths) is rejected.
        """
        for segment in (intent_scope, content_scope):
            if not _SCOPE_SEGMENT.match(segment):
                raise SecurityViolationError(
                    f"unsafe staging scope segment: {segment!r}",
                    hint="scope segments must match [A-Za-z0-9][A-Za-z0-9._-]*",
                )
            if ".." in segment:
                raise SecurityViolationError(f"unsafe staging scope segment: {segment!r}")
        target = self.staging_root / intent_scope / content_scope
        target.mkdir(parents=True, exist_ok=True)
        return target
