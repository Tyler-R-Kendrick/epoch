---
product: Cline
slug: cline
category: open_source_ide_cli_coding_agent
primary_sources:
  - https://docs.cline.bot/cline-overview
  - https://docs.cline.bot/features/plan-and-act
  - https://docs.cline.bot/core-workflows/checkpoints
  - https://cline.bot/pricing
---

# Cline

Cline is an open-source AI coding agent that runs in editors, terminal, CLI, SDK, and Kanban-style task surfaces. It reads and writes files, runs commands, uses browser and web tools, connects to MCP servers, separates planning from acting, and creates checkpoints so users can restore file state while preserving useful task context.

## Competitive Relevance

- Cline competes for developers who want Cursor/Windsurf-style agent capability without giving up VS Code, JetBrains, terminal workflows, BYOK economics, or open-source auditability.
- Its Plan and Act modes make agent authority explicit: read-only exploration first, then file and command execution after the user is ready.
- Checkpoints overlap directly with Epoch's recovery and history story, but Cline stores them in a shadow Git repository tied to the task surface.
- Enterprise messaging now targets governance, provider controls, observability, role-based access, spend visibility, and local or private deployment.

## Epoch Implications

- Cline's checkpoint UX shows that developers value rollback between every tool step, not only at final commits.
- Epoch can differentiate by making checkpoints portable, signed, and connected to repository history rather than editor/task-local snapshots.
- Cline's tool-approval and MCP model creates useful evidence boundaries that Epoch could preserve: which tools were exposed, which actions were approved, and which commands ran.

## Unknowns To Track

- Cline is moving quickly across IDE, CLI, SDK, Kanban, enterprise, and MCP marketplace surfaces.
- Usage-based inference can be cheaper and more transparent than subscriptions, but public sentiment still flags runaway context cost and configuration complexity.
