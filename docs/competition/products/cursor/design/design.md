---
product: Cursor
design_sources:
  - https://www.cursor.com/
  - https://docs.cursor.com/agent
  - https://docs.cursor.com/en/inline-edit/overview
  - https://docs.cursor.com/en/agent/chat/checkpoints
  - https://docs.cursor.com/background-agents
  - https://docs.cursor.com/en/bugbot
---

# Design

## Look And Feel

Cursor inherits the dense, keyboard-first shape of VS Code and layers AI controls into chat panels, inline edit boxes, mode pickers, apply/reject affordances, checkpoints, and background-agent sidebars. The public docs and product imagery emphasize an editor-native workflow rather than a separate web dashboard.

## Open Design Assets

- Public docs include screenshots for Agent modes, inline edit, checkpoints, Background Agents, rules, and Bugbot dashboards.
- Cursor does not appear to publish a reusable public design-token package for the editor shell.
- The strongest inspectable design artifact is the docs corpus: it names the core interaction surfaces and shows the product vocabulary.

## Differentiators

- Cursor's design differentiates through proximity: AI suggestions, file edits, command execution, restore points, and code review links live where developers already inspect code.
- Mode selection makes risk visible. Ask, Manual, Agent, and Custom modes imply different autonomy levels before the model acts.
- Checkpoints are presented as a lightweight safety rail at the exact moment a user reviews an agent conversation.

## What Works

- Inline edit and Apply keep the user close to the changed code, which lowers review friction for small edits.
- Agent mode's ability to search, edit, run commands, and repair errors creates a compact loop for feature work.
- Bugbot's "Fix in Cursor" and "Fix in Web" paths connect PR review comments to a concrete remediation surface.

## UX Breakdowns

- Checkpoints are local, automatic, cleanup-prone, and limited to Agent edits, so they can create a false sense of durable history for users who do not also commit to Git.
- Background agents add remote execution state, data-retention boundaries, and handoff complexity that are hard to reason about from a normal editor sidebar.
- Cost, mode, model, and autonomy choices are tightly coupled; users may not understand when a task is becoming a high-cost remote-agent run.

## Epoch Design Lessons

- Epoch should make agent autonomy level, signed source snapshot, generated diff, test evidence, and rollback target visible in one history chain.
- Restore affordances should be backed by durable history, not only editor-local checkpoints.
- Repository rules should be auditable inputs to an agent change, not invisible prompt decoration.
