"""gauntlet-loop deterministic control plane.

The package is the state, validation, authority, and evidence plane of the
gauntlet-loop Agent Skill. It never embeds an LLM; the host agent proposes,
these modules validate, persist, authorize, execute, compare, and promote.
"""

from __future__ import annotations

__version__ = "0.1.0"

SKILL_CONTRACT = "dev.gauntlet/v1"
