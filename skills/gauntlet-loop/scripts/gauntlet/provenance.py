"""Provenance orchestration: PROV export, unsigned statements, cosign.

Format and CLI specifics live in ``gauntlet.adapters.prov`` and
``gauntlet.adapters.attestation``; this module wires them to gauntlet
records and enforces the honesty rules:

- W3C PROV-compatible JSON / JSON-LD export from ``ProvenanceRecordV1``;
- unsigned in-toto Statements carry an explicit ``unsigned: true`` marker
  and are never called attestations or signatures;
- optional SLSA-style provenance for software builds;
- cosign sign/verify run only through the injected ``ProcessRunner`` when
  the CLI is configured and present -- a missing CLI raises
  ``DependencyUnavailableError`` with guidance, and no signature is ever
  fabricated.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from gauntlet.adapters.attestation import (
    build_slsa_provenance,
    build_unsigned_statement,
    cosign_sign_blob,
    cosign_verify_blob,
)
from gauntlet.adapters.prov import to_prov_json, to_prov_jsonld
from gauntlet.errors import DependencyUnavailableError
from gauntlet.models import IntegrationsConfigV1, ProvenanceRecordV1
from gauntlet.support import ProcessRunner


def export_prov_json(record: ProvenanceRecordV1) -> dict[str, Any]:
    """W3C PROV-JSON export of a provenance record."""
    return to_prov_json(record)


def export_prov_jsonld(record: ProvenanceRecordV1) -> dict[str, Any]:
    """W3C PROV JSON-LD export of a provenance record."""
    return to_prov_jsonld(record)


def build_gauntlet_statement(
    record: ProvenanceRecordV1,
    *,
    subjects: list[tuple[str, str]],
    extra_predicate: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Unsigned in-toto Statement (v1) with the dev.gauntlet predicate."""
    predicate: dict[str, Any] = {
        "provenance_record": record.record_id,
        "activities": list(record.activities),
        "agents": [agent.actor_id for agent in record.agents],
        **(extra_predicate or {}),
    }
    return build_unsigned_statement(subjects=subjects, predicate=predicate)


def build_build_provenance(
    *,
    subjects: list[tuple[str, str]],
    builder_id: str,
    build_type: str,
    invocation: dict[str, Any],
    materials: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Optional SLSA-style provenance for software builds (still unsigned)."""
    return build_slsa_provenance(
        subjects=subjects,
        builder_id=builder_id,
        build_type=build_type,
        invocation=invocation,
        materials=materials,
    )


def _require_cosign_enabled(integrations: IntegrationsConfigV1) -> None:
    if integrations.cosign_cli == "off":
        raise DependencyUnavailableError(
            "cosign signing is disabled by configuration",
            hint="set integrations.cosign_cli to 'auto' or 'on' in .gauntlet/config.yaml",
        )


def sign_statement(
    payload_path: Path,
    signature_path: Path,
    *,
    runner: ProcessRunner,
    integrations: IntegrationsConfigV1,
    key_ref: str | None = None,
) -> list[str]:
    """Sign a serialized statement with cosign (configured + present only)."""
    _require_cosign_enabled(integrations)
    return cosign_sign_blob(payload_path, signature_path, runner=runner, key_ref=key_ref)


def verify_statement(
    payload_path: Path,
    signature_path: Path,
    *,
    runner: ProcessRunner,
    integrations: IntegrationsConfigV1,
    key_ref: str | None = None,
    certificate_identity: str | None = None,
    certificate_oidc_issuer: str | None = None,
) -> list[str]:
    """Verify a statement signature with cosign; failure is a hard error."""
    _require_cosign_enabled(integrations)
    return cosign_verify_blob(
        payload_path,
        signature_path,
        runner=runner,
        key_ref=key_ref,
        certificate_identity=certificate_identity,
        certificate_oidc_issuer=certificate_oidc_issuer,
    )
