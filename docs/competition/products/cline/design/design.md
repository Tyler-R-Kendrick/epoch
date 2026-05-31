---
product: Cline
slug: cline
design_sources:
  - https://docs.cline.bot/cline-overview
  - https://docs.cline.bot/features/plan-and-act
  - https://docs.cline.bot/core-workflows/checkpoints
  - https://cline.bot/enterprise
---

# Design

## Look And Feel

Cline's design mixes IDE-native sidebars, chat/task transcripts, approval prompts, diffs, checkpoint markers, settings panes, terminal/CLI surfaces, and a web Kanban board for parallel agents. The public site is darker and bolder than the docs: strong open-source star count, "transparent pricing" claims, enterprise security language, provider logos, dashboard mockups, and feature bands around provider choice and governance.

## Open Design Artifacts

- Cline publishes detailed documentation for Plan/Act mode, checkpoints, tools, MCP, rules, memory, CLI, SDK, and enterprise monitoring.
- The public docs include screenshot references for mode selectors, permissions, checkpoint compare/restore, and configuration surfaces.
- There is no separate design-token package; the design contract is the IDE extension UI, CLI, Kanban, and Mintlify documentation system.

## Differentiators

- Plan/Act creates a clear cognitive split between exploration and mutation.
- Checkpoints after tool use make risky autonomous edits feel recoverable.
- Tool approval and auto-approval policies make agent authority visible.
- Enterprise pages combine local-processing claims, provider flexibility, governance, spend analytics, and observability into a coherent buyer story.

## What Works Well

- The checkpoint compare/restore model maps cleanly onto how developers debug agent mistakes.
- The interface surfaces every file read, write, command, token/cost signal, and approval, which strengthens user trust.
- Multi-surface product design lets Cline span solo IDE use, headless automation, SDK embedding, and team task orchestration.

## Where It Breaks Down

- The product surface is broad enough to become hard to reason about: IDE, CLI, SDK, Kanban, plugins, MCP, hooks, teams, enterprise dashboards, and provider setup all coexist.
- Checkpoints use a shadow Git repository, which protects normal history but creates another state layer users must trust and understand.
- BYOK and usage-based pricing are transparent for experts, but they can make cost anxiety more immediate than subscription caps.
