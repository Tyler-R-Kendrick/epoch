"""Secret redaction applied before anything is persisted or emitted.

The redactor is deliberately conservative: known sensitive key names, common
token shapes, and configured patterns. It is a safety net, not a substitute
for an established scanner (hook points exist for detect-secrets).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

REDACTED = "[REDACTED]"

_SENSITIVE_KEY_PATTERN = re.compile(
    r"(?i)(api[-_]?key|secret|token|password|passwd|credential|authorization|auth[-_]?header"
    r"|private[-_]?key|session[-_]?id|cookie|bearer)"
)

_SENSITIVE_VALUE_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\b(?:sk|pk|rk|ghp|gho|ghu|ghs|xoxb|xoxp)-[A-Za-z0-9_-]{10,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b"),
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}"),
)


@dataclass
class Redactor:
    """Deterministic redactor; extra patterns come from privacy policy."""

    extra_patterns: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._compiled_extra = [re.compile(pattern) for pattern in self.extra_patterns]

    def redact_text(self, text: str) -> tuple[str, list[str]]:
        """Return redacted text and a report of which rules fired."""
        report: list[str] = []
        result = text
        for index, pattern in enumerate(_SENSITIVE_VALUE_PATTERNS):
            result, count = pattern.subn(REDACTED, result)
            if count:
                report.append(f"builtin-value-pattern-{index}:{count}")
        for index, pattern in enumerate(self._compiled_extra):
            result, count = pattern.subn(REDACTED, result)
            if count:
                report.append(f"configured-pattern-{index}:{count}")
        return result, report

    def redact_value(self, value: Any) -> tuple[Any, list[str]]:
        """Recursively redact dicts/lists/strings; keys drive redaction too."""
        report: list[str] = []

        def walk(node: Any, key_hint: str | None) -> Any:
            if isinstance(node, dict):
                return {
                    key: walk(item, key if isinstance(key, str) else None)
                    for key, item in node.items()
                }
            if isinstance(node, list):
                return [walk(item, key_hint) for item in node]
            if isinstance(node, str):
                if key_hint is not None and _SENSITIVE_KEY_PATTERN.search(key_hint):
                    report.append(f"sensitive-key:{key_hint}")
                    return REDACTED
                redacted, sub_report = self.redact_text(node)
                report.extend(sub_report)
                return redacted
            return node

        return walk(value, None), report
