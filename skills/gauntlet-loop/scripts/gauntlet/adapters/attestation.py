"""in-toto/SLSA statement builders and optional cosign invocation.

This module implements format and CLI specifics; ``gauntlet.provenance``
orchestrates. It must never import ``gauntlet.provenance`` (that would be a
circular import).

Honesty rules enforced here:

- statements produced by the builders are **unsigned**: the predicate carries
  ``"unsigned": True`` and a human-readable label, and nothing here ever
  calls an unsigned statement an attestation or signature;
- cosign is invoked only through the injected ``ProcessRunner`` when the CLI
  is actually present; a missing CLI raises
  :class:`~gauntlet.errors.DependencyUnavailableError` with installation
  guidance, and signatures are never fabricated.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from gauntlet.canonical_json import parse_digest
from gauntlet.errors import (
    DependencyUnavailableError,
    InvalidInvocationError,
    SecurityViolationError,
)
from gauntlet.support import ProcessRunner

IN_TOTO_STATEMENT_TYPE = "https://in-toto.io/Statement/v1"
GAUNTLET_PREDICATE_TYPE = "https://gauntlet.dev/predicates/dev.gauntlet/v1"
SLSA_PREDICATE_TYPE = "https://slsa.dev/provenance/v1"
UNSIGNED_LABEL = "UNSIGNED gauntlet statement: not an attestation or signature"

_COSIGN_INSTALL_HINT = (
    "install cosign from https://docs.sigstore.dev/cosign/system_config/installation/ "
    "and enable integrations.cosign_cli in .gauntlet/config.yaml"
)


def _subject(name: str, digest: str) -> dict[str, Any]:
    algorithm, value = parse_digest(digest)
    return {"name": name, "digest": {algorithm: value}}


def build_unsigned_statement(
    *,
    subjects: list[tuple[str, str]],
    predicate: dict[str, Any],
) -> dict[str, Any]:
    """Build an unsigned in-toto Statement (v1) with the gauntlet predicate.

    ``subjects`` is a list of (name, ``sha256:<hex>`` digest) pairs.
    """
    if not subjects:
        raise InvalidInvocationError("an in-toto statement requires at least one subject")
    return {
        "_type": IN_TOTO_STATEMENT_TYPE,
        "subject": [_subject(name, digest) for name, digest in subjects],
        "predicateType": GAUNTLET_PREDICATE_TYPE,
        "predicate": {
            **predicate,
            "unsigned": True,
            "label": UNSIGNED_LABEL,
        },
    }


def build_slsa_provenance(
    *,
    subjects: list[tuple[str, str]],
    builder_id: str,
    build_type: str,
    invocation: dict[str, Any],
    materials: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build an unsigned SLSA-style provenance statement for a software build."""
    if not subjects:
        raise InvalidInvocationError("SLSA provenance requires at least one subject")
    return {
        "_type": IN_TOTO_STATEMENT_TYPE,
        "subject": [_subject(name, digest) for name, digest in subjects],
        "predicateType": SLSA_PREDICATE_TYPE,
        "predicate": {
            "buildDefinition": {
                "buildType": build_type,
                "externalParameters": invocation,
                "resolvedDependencies": materials or [],
            },
            "runDetails": {"builder": {"id": builder_id}},
            "unsigned": True,
            "label": UNSIGNED_LABEL,
        },
    }


# ---------------------------------------------------------------------------
# cosign (optional, injected ProcessRunner only)
# ---------------------------------------------------------------------------


def cosign_sign_blob(
    payload_path: Path,
    signature_path: Path,
    *,
    runner: ProcessRunner,
    key_ref: str | None = None,
) -> list[str]:
    """Sign a blob with cosign; returns the argv used.

    Raises :class:`DependencyUnavailableError` when the CLI is missing and
    never fabricates a signature on failure.
    """
    argv = ["cosign", "sign-blob", "--yes", "--output-signature", str(signature_path)]
    if key_ref is not None:
        argv.extend(["--key", key_ref])
    argv.append(str(payload_path))
    try:
        completed = runner.run(argv)
    except InvalidInvocationError as error:
        raise DependencyUnavailableError(
            "the cosign CLI is not available", hint=_COSIGN_INSTALL_HINT
        ) from error
    if completed.exit_code != 0:
        raise SecurityViolationError(
            f"cosign sign-blob failed with exit code {completed.exit_code}: "
            f"{completed.stderr.strip()[:500]}"
        )
    return argv


def cosign_verify_blob(
    payload_path: Path,
    signature_path: Path,
    *,
    runner: ProcessRunner,
    key_ref: str | None = None,
    certificate_identity: str | None = None,
    certificate_oidc_issuer: str | None = None,
) -> list[str]:
    """Verify a blob signature with cosign; returns the argv used."""
    argv = ["cosign", "verify-blob", "--signature", str(signature_path)]
    if key_ref is not None:
        argv.extend(["--key", key_ref])
    if certificate_identity is not None:
        argv.extend(["--certificate-identity", certificate_identity])
    if certificate_oidc_issuer is not None:
        argv.extend(["--certificate-oidc-issuer", certificate_oidc_issuer])
    argv.append(str(payload_path))
    try:
        completed = runner.run(argv)
    except InvalidInvocationError as error:
        raise DependencyUnavailableError(
            "the cosign CLI is not available", hint=_COSIGN_INSTALL_HINT
        ) from error
    if completed.exit_code != 0:
        raise SecurityViolationError(
            f"cosign verification failed for {payload_path.name}: "
            f"{completed.stderr.strip()[:500]}",
            hint="the signature does not verify; treat the payload as untrusted",
        )
    return argv
