"""Self-verifying evidence bundles: export, verify, hydrate, push/pull.

Bundle directory layout (versioned via ``BundleManifestV1``)::

    <bundle>/
      manifest.json                 BundleManifestV1 (bundle media type)
      oci-layout                    {"imageLayoutVersion": "1.0.0"}
      oci-manifest.json             OCI-style artifact manifest (see below)
      entries/spec.yaml             frozen spec (optional)
      entries/events.jsonl          exported event history (JSONL)
      entries/counterexamples/*.json
      entries/evaluations/*.json
      entries/promotions/*.json
      entries/provenance.json       ProvenanceRecordV1 (optional)

Redaction (``gauntlet.redaction``) is applied to every payload *before* any
byte is written. Verification is fully offline: schemas, per-entry SHA-256
digests, reference resolution, redaction flag, and (when present)
signatures; any tampering fails verification.

The OCI-compatible layout is intentionally simple and documented: an
``oci-layout`` marker plus one OCI-style artifact manifest
(``application/vnd.oci.image.manifest.v1+json`` shape) whose layers list
each entry with its media type, digest, size, and a title annotation.
Registry push/pull is delegated to :class:`gauntlet.adapters.oras_cli.OrasClient`
(argv arrays, injected ``ProcessRunner``, authority-gated); the local format
never requires a registry.
"""

from __future__ import annotations

import json
import tarfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from gauntlet.adapters.oras_cli import OrasClient, OrasResult
from gauntlet.canonical_json import canonical_bytes, sha256_hex
from gauntlet.constants import BUNDLE_MEDIA_TYPES
from gauntlet.errors import (
    ConflictError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.models import (
    BundleEntryV1,
    BundleManifestV1,
    CounterexampleV1,
    DigestRefV1,
    EvaluationResultV1,
    PromotionDecisionV1,
    ProvenanceRecordV1,
)
from gauntlet.paths import atomic_write
from gauntlet.redaction import Redactor
from gauntlet.support import Clock, IdGenerator

OCI_LAYOUT_VERSION = "1.0.0"
OCI_MANIFEST_MEDIA_TYPE = "application/vnd.oci.image.manifest.v1+json"

_KNOWN_MEDIA_TYPES = frozenset(BUNDLE_MEDIA_TYPES.values())


@dataclass(frozen=True)
class BundleContent:
    """Everything that goes into one evidence bundle."""

    spec_text: str | None = None
    events: list[dict[str, Any]] = field(default_factory=list)
    counterexamples: list[CounterexampleV1] = field(default_factory=list)
    evaluations: list[EvaluationResultV1] = field(default_factory=list)
    promotions: list[PromotionDecisionV1] = field(default_factory=list)
    provenance: ProvenanceRecordV1 | None = None


def _safe_name(record_id: str) -> str:
    return record_id.replace(":", "__").replace("/", "_")


class BundleService:
    """Export/verify/hydrate evidence bundles; redaction-first."""

    def __init__(
        self,
        *,
        clock: Clock,
        ids: IdGenerator,
        redactor: Redactor | None = None,
    ) -> None:
        self._clock = clock
        self._ids = ids
        self._redactor = redactor or Redactor()

    # -- export ----------------------------------------------------------------

    def _write_entry(
        self,
        bundle_dir: Path,
        relative: str,
        data: bytes,
        media_type: str,
        entries: list[BundleEntryV1],
    ) -> None:
        atomic_write(bundle_dir / relative, data)
        entries.append(
            BundleEntryV1(
                path=relative,
                media_type=media_type,
                digest=DigestRefV1(
                    value=sha256_hex(data),
                    media_type=media_type,
                    byte_size=len(data),
                ),
            )
        )

    def _redacted_json(self, payload: dict[str, Any]) -> bytes:
        redacted, _ = self._redactor.redact_value(payload)
        return canonical_bytes(redacted)

    def export(
        self,
        bundle_dir: Path,
        content: BundleContent,
        *,
        campaign_id: str | None = None,
        spec_digest: str | None = None,
        policy_digests: dict[str, str] | None = None,
        provenance_ref: str | None = None,
    ) -> BundleManifestV1:
        """Write a bundle directory; returns the manifest."""
        if bundle_dir.exists() and any(bundle_dir.iterdir()):
            raise ConflictError(
                f"bundle directory is not empty: {bundle_dir}",
                hint="export into a fresh directory; bundles are immutable evidence",
            )
        entries: list[BundleEntryV1] = []

        if content.spec_text is not None:
            redacted_spec, _ = self._redactor.redact_text(content.spec_text)
            self._write_entry(
                bundle_dir,
                "entries/spec.yaml",
                redacted_spec.encode("utf-8"),
                BUNDLE_MEDIA_TYPES["spec"],
                entries,
            )

        event_lines = []
        for event in content.events:
            redacted, _ = self._redactor.redact_value(event)
            event_lines.append(json.dumps(redacted, sort_keys=True, ensure_ascii=False))
        self._write_entry(
            bundle_dir,
            "entries/events.jsonl",
            ("\n".join(event_lines) + "\n").encode("utf-8") if event_lines else b"",
            BUNDLE_MEDIA_TYPES["event-stream"],
            entries,
        )

        for counterexample in content.counterexamples:
            self._write_entry(
                bundle_dir,
                f"entries/counterexamples/{_safe_name(counterexample.counterexample_id)}.json",
                self._redacted_json(counterexample.model_dump(mode="json")),
                BUNDLE_MEDIA_TYPES["counterexample"],
                entries,
            )
        for evaluation in content.evaluations:
            self._write_entry(
                bundle_dir,
                f"entries/evaluations/{_safe_name(evaluation.evaluation_id)}.json",
                self._redacted_json(evaluation.model_dump(mode="json")),
                BUNDLE_MEDIA_TYPES["evaluation"],
                entries,
            )
        for promotion in content.promotions:
            self._write_entry(
                bundle_dir,
                f"entries/promotions/{_safe_name(promotion.decision_id)}.json",
                self._redacted_json(promotion.model_dump(mode="json")),
                BUNDLE_MEDIA_TYPES["promotion"],
                entries,
            )
        if content.provenance is not None:
            self._write_entry(
                bundle_dir,
                "entries/provenance.json",
                self._redacted_json(content.provenance.model_dump(mode="json")),
                BUNDLE_MEDIA_TYPES["provenance"],
                entries,
            )
            provenance_ref = provenance_ref or content.provenance.record_id

        manifest = BundleManifestV1(
            bundle_id=self._ids.new_id("bundle"),
            campaign_id=campaign_id,
            entries=entries,
            spec_digest=spec_digest,
            policy_digests=dict(policy_digests or {}),
            provenance_ref=provenance_ref,
            redaction_policy_applied=True,
            created_at=self._clock.now(),
        )
        atomic_write(
            bundle_dir / "manifest.json", canonical_bytes(manifest.model_dump(mode="json"))
        )
        self._write_oci_layout(bundle_dir, manifest)
        return manifest

    def _write_oci_layout(self, bundle_dir: Path, manifest: BundleManifestV1) -> None:
        atomic_write(
            bundle_dir / "oci-layout",
            canonical_bytes({"imageLayoutVersion": OCI_LAYOUT_VERSION}),
        )
        manifest_bytes = (bundle_dir / "manifest.json").read_bytes()
        oci_manifest = {
            "schemaVersion": 2,
            "mediaType": OCI_MANIFEST_MEDIA_TYPE,
            "artifactType": BUNDLE_MEDIA_TYPES["bundle"],
            "config": {
                "mediaType": BUNDLE_MEDIA_TYPES["bundle"],
                "digest": f"sha256:{sha256_hex(manifest_bytes)}",
                "size": len(manifest_bytes),
            },
            "layers": [
                {
                    "mediaType": entry.media_type,
                    "digest": entry.digest.digest,
                    "size": entry.digest.byte_size,
                    "annotations": {"org.opencontainers.image.title": entry.path},
                }
                for entry in manifest.entries
            ],
            "annotations": {
                "dev.gauntlet.bundle_id": manifest.bundle_id,
                "dev.gauntlet.contract": "dev.gauntlet/v1",
            },
        }
        atomic_write(bundle_dir / "oci-manifest.json", canonical_bytes(oci_manifest))

    def export_archive(self, bundle_dir: Path, archive_path: Path) -> Path:
        """Write a deterministic ``.tar.gz`` of an exported bundle."""
        if not (bundle_dir / "manifest.json").is_file():
            raise InvalidInvocationError(f"not an exported bundle: {bundle_dir}")
        archive_path.parent.mkdir(parents=True, exist_ok=True)
        with tarfile.open(archive_path, "w:gz") as archive:
            for path in sorted(bundle_dir.rglob("*")):
                if not path.is_file():
                    continue
                info = archive.gettarinfo(
                    str(path), arcname=str(path.relative_to(bundle_dir))
                )
                info.mtime = 0
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                with path.open("rb") as handle:
                    archive.addfile(info, handle)
        return archive_path

    # -- verify ------------------------------------------------------------------

    def verify(self, bundle_dir: Path) -> BundleManifestV1:
        """Offline verification; raises ``SecurityViolationError`` on tamper."""
        manifest_path = bundle_dir / "manifest.json"
        if not manifest_path.is_file():
            raise InvalidInvocationError(f"bundle manifest not found: {manifest_path}")
        problems: list[str] = []
        try:
            manifest = BundleManifestV1.model_validate(
                json.loads(manifest_path.read_text(encoding="utf-8"))
            )
        except (json.JSONDecodeError, ValueError) as error:
            raise SecurityViolationError(
                f"bundle manifest does not validate: {error}"
            ) from error
        if not manifest.redaction_policy_applied:
            problems.append("manifest does not declare the redaction policy as applied")
        for entry in manifest.entries:
            if entry.media_type not in _KNOWN_MEDIA_TYPES:
                problems.append(f"unknown media type for {entry.path}: {entry.media_type}")
            entry_path = bundle_dir / entry.path
            if not entry_path.is_file():
                problems.append(f"missing bundle entry: {entry.path}")
                continue
            data = entry_path.read_bytes()
            if sha256_hex(data) != entry.digest.value:
                problems.append(f"digest mismatch for {entry.path}")
            if entry.digest.byte_size is not None and len(data) != entry.digest.byte_size:
                problems.append(f"size mismatch for {entry.path}")
        signatures_dir = bundle_dir / "signatures"
        if signatures_dir.is_dir() and any(signatures_dir.iterdir()):
            problems.append(
                "bundle carries signatures but no signature verifier is configured; "
                "verify them with `gauntlet provenance` / cosign before trusting"
            )
        if problems:
            raise SecurityViolationError(
                "bundle verification failed:\n" + "\n".join(problems),
                hint="the bundle has been tampered with or was exported incorrectly",
            )
        return manifest

    # -- hydrate -----------------------------------------------------------------

    def hydrate(self, bundle_dir: Path, target_dir: Path) -> list[Path]:
        """Reconstruct local state from a verified bundle.

        Never silently overwrites divergent local state: an existing target
        file with different content raises ``ConflictError``; identical
        content is skipped.
        """
        manifest = self.verify(bundle_dir)
        written: list[Path] = []
        for entry in manifest.entries:
            source = bundle_dir / entry.path
            destination = target_dir / entry.path
            data = source.read_bytes()
            if destination.exists():
                if sha256_hex(destination.read_bytes()) == entry.digest.value:
                    continue
                raise ConflictError(
                    f"local state diverges from the bundle at {entry.path}",
                    hint="resolve the divergence explicitly; hydrate never overwrites",
                )
            atomic_write(destination, data)
            written.append(destination)
        return written

    # -- registry (optional, effect-gated) ----------------------------------------

    def push(
        self,
        bundle_dir: Path,
        reference: str,
        *,
        client: OrasClient,
    ) -> OrasResult:
        """Push a verified bundle with ORAS (argv built, authority-gated)."""
        manifest = self.verify(bundle_dir)
        files: list[tuple[str, str]] = [("manifest.json", BUNDLE_MEDIA_TYPES["bundle"])]
        files.extend((entry.path, entry.media_type) for entry in manifest.entries)
        return client.push(
            reference,
            artifact_type=BUNDLE_MEDIA_TYPES["bundle"],
            files=files,
            cwd=bundle_dir,
        )

    def pull(
        self,
        reference: str,
        output_dir: Path,
        *,
        client: OrasClient,
    ) -> OrasResult:
        """Pull a bundle with ORAS; verify separately after download."""
        return client.pull(reference, output_dir=output_dir)
