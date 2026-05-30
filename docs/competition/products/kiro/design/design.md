---
product: Kiro
slug: kiro
design_sources:
  - https://kiro.dev/
  - https://kiro.dev/docs/
  - https://kiro.dev/docs/steering/
  - https://kiro.dev/docs/chat/subagents/
---

# Design

## Look And Feel

Kiro uses a familiar Code OSS-style IDE shell but shifts attention toward spec artifacts and agent task execution. Public screenshots and transcripts show `tasks.md`, implementation plans, task status cards, completed task states, view-changes/view-execution links, and a right-side AI chat panel. The landing page pairs that IDE surface with terminal-agent imagery and a "vibe coding to viable code" narrative.

## Open Design Artifacts

- The docs describe Kiro's visible product primitives: specs, hooks, agentic chat, steering, MCP servers, privacy controls, subagents, IDE, CLI, and web.
- Steering docs specify markdown file locations, workspace/global/team scopes, inclusion modes, and generated foundation docs.
- The pricing page documents individual and team plan structure, credits, overages, model access, usage dashboards, and supported surfaces.

## Differentiators

- Specs make requirements, design, and tasks first-class UI objects rather than hidden chat context.
- Hooks let agent work trigger from events, making documentation, tests, and performance tasks part of the development environment.
- Subagents explicitly split context windows and return summarized results to the main agent.
- Team steering and enterprise plan controls connect agent behavior to organization-level standards.

## What Works Well

- The product gives teams a concrete answer to "how do we avoid chaotic vibe coding?"
- Spec/task status UI creates checkpoints that a reviewer can reason about before inspecting code.
- Steering files are repo/team-readable markdown, which makes agent alignment easier to audit than invisible prompt memory.

## Where It Breaks Down

- The structured flow can be too heavy for small fixes where a direct terminal agent would be faster.
- Credit-metered hooks, spec refinement, task execution, and web/CLI usage make cost forecasting more complicated.
- Background hooks and subagents can make it harder to see which agent action caused a file or test change unless evidence is preserved outside the chat pane.
