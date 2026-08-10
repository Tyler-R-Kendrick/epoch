"""RFC 8785 canonical JSON and SHA-256 digests.

All persisted identity digests are computed over the canonical serialization
produced here, via the maintained ``rfc8785`` library. Never hash a
non-canonical dump.
"""

from __future__ import annotations

import hashlib
from typing import Any

import rfc8785

from gauntlet.constants import DIGEST_ALGORITHM
from gauntlet.errors import InvalidInvocationError


def canonical_bytes(value: Any) -> bytes:
    """Serialize ``value`` as RFC 8785 canonical JSON bytes."""
    try:
        result: bytes = rfc8785.dumps(value)
    except Exception as error:  # rfc8785 raises library-specific errors
        raise InvalidInvocationError(
            f"value is not canonical-JSON serializable: {error}"
        ) from error
    return result


def canonical_text(value: Any) -> str:
    return canonical_bytes(value).decode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def digest_value(value: Any) -> str:
    """Return ``sha256:<hex>`` over the canonical JSON of ``value``."""
    return f"{DIGEST_ALGORITHM}:{sha256_hex(canonical_bytes(value))}"


def digest_bytes(data: bytes) -> str:
    return f"{DIGEST_ALGORITHM}:{sha256_hex(data)}"


def parse_digest(digest: str) -> tuple[str, str]:
    """Split ``algorithm:value`` and validate the shape."""
    algorithm, _, value = digest.partition(":")
    if not algorithm or not value:
        raise InvalidInvocationError(f"malformed digest: {digest!r}")
    if algorithm != DIGEST_ALGORITHM:
        raise InvalidInvocationError(
            f"unsupported digest algorithm: {algorithm!r}",
            hint=f"only {DIGEST_ALGORITHM} is supported by dev.gauntlet/v1",
        )
    if len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
        raise InvalidInvocationError(f"malformed {DIGEST_ALGORITHM} digest value: {value!r}")
    return algorithm, value
