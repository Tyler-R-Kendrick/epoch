"""Arazzo and Open Workflow Specification exporters (orchestration shape only).

Version assumptions (documented for THIRD_PARTY/references):

- Arazzo: version ``1.0.1`` documents;
- Open Workflow Specification: an OWS-style JSON document declaring
  ``specVersion: "0.1"`` (the specification is still emerging; the shape
  here is versioned so consumers can detect changes).

These exports describe *orchestration shape and dependencies only*. They do
not replace gauntlet authority, evidence, evaluator, or promotion semantics;
consumers must treat them as documentation of the command sequence, with the
binding gauntlet contract digests carried in metadata.
"""

from __future__ import annotations

import shlex
from typing import Any

import yaml

from gauntlet.errors import InvalidInvocationError

ARAZZO_VERSION = "1.0.1"
OWS_SPEC_VERSION = "0.1"

_AUTHORITY_NOTE = (
    "Orchestration shape only: gauntlet authority, evidence, evaluator, and "
    "promotion semantics are NOT replaced by this document."
)


def _step_entries(commands: list[list[str]]) -> list[dict[str, Any]]:
    if not commands:
        raise InvalidInvocationError("a workflow export needs at least one command")
    steps: list[dict[str, Any]] = []
    for index, argv in enumerate(commands):
        if not argv:
            raise InvalidInvocationError(f"command at index {index} is empty")
        steps.append(
            {
                "step_id": f"step_{index + 1}",
                "argv": list(argv),
                "display": shlex.join(argv),
            }
        )
    return steps


def export_arazzo_yaml(
    *,
    campaign_id: str,
    commands: list[list[str]],
    contract_digests: dict[str, str],
    description: str = "Gauntlet campaign command sequence",
) -> str:
    """Produce a minimal valid Arazzo 1.x YAML document for the campaign."""
    steps = _step_entries(commands)
    workflow_id = campaign_id.replace(":", "-").replace("/", "-")
    document: dict[str, Any] = {
        "arazzo": ARAZZO_VERSION,
        "info": {
            "title": f"Gauntlet campaign {campaign_id}",
            "version": "1.0.0",
            "description": description,
            "x-gauntlet": {
                "contract": "dev.gauntlet/v1",
                "contract_digests": dict(contract_digests),
                "note": _AUTHORITY_NOTE,
            },
        },
        "sourceDescriptions": [
            {
                "name": "gauntlet-cli",
                "url": "https://gauntlet.dev/contracts/dev.gauntlet-v1.openapi.json",
                "type": "openapi",
            }
        ],
        "workflows": [
            {
                "workflowId": workflow_id,
                "summary": description,
                "steps": [
                    {
                        "stepId": step["step_id"],
                        "operationId": "runGauntletCommand",
                        "parameters": [
                            {
                                "name": "argv",
                                "in": "query",
                                "value": step["display"],
                            }
                        ],
                    }
                    for step in steps
                ],
            }
        ],
    }
    return yaml.safe_dump(document, sort_keys=False, allow_unicode=True)


def export_open_workflow_json(
    *,
    campaign_id: str,
    commands: list[list[str]],
    contract_digests: dict[str, str],
    description: str = "Gauntlet campaign command sequence",
) -> dict[str, Any]:
    """Produce an OWS-style JSON document; sequential dependencies only."""
    steps = _step_entries(commands)
    tasks: list[dict[str, Any]] = []
    for index, step in enumerate(steps):
        task: dict[str, Any] = {
            "id": step["step_id"],
            "type": "command",
            "command": step["argv"],
        }
        if index > 0:
            task["dependsOn"] = [steps[index - 1]["step_id"]]
        tasks.append(task)
    return {
        "specVersion": OWS_SPEC_VERSION,
        "name": campaign_id.replace(":", "-").replace("/", "-"),
        "description": description,
        "tasks": tasks,
        "metadata": {
            "x-gauntlet": {
                "contract": "dev.gauntlet/v1",
                "contract_digests": dict(contract_digests),
                "note": _AUTHORITY_NOTE,
            }
        },
    }
