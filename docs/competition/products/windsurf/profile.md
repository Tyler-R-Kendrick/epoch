---
product: Windsurf
slug: windsurf
category: ai_native_ide_cascade_workflows_and_checkpoints
primary_sources:
  - https://docs.windsurf.com/windsurf
  - https://docs.windsurf.com/windsurf/cascade
  - https://docs.windsurf.com/windsurf/cascade/memories
  - https://docs.windsurf.com/windsurf/cascade/workflows
  - https://docs.windsurf.com/windsurf/cascade/app-deploys
  - https://docs.windsurf.com/windsurf/models
---

# Windsurf

Windsurf is an AI-native IDE centered on Cascade, an agentic assistant with Code and Chat modes, tool calling, planning, memories, rules, workflows, named checkpoints, real-time awareness, simultaneous conversations, MCP, terminal integration, linter fixes, and preview deploys. It competes with Epoch around repeatable agent trajectories, project-local instructions, rollback, and deployment evidence.

## Competitive Relevance

- Cascade can edit code, run tools, create todo plans, use web search, call MCP servers, and reference previous conversations.
- Workflows are markdown files stored in `.windsurf/workflows/` or global/system locations, making repeatable agent procedures visible in the repository.
- Memories and rules create persistent context for agent behavior, while `.codeiumignore` and enterprise global ignore rules constrain accessible files.
- Named checkpoints and reverts give users an agent-specific recovery path, but reverts are currently irreversible.

## Epoch Implications

- Windsurf shows that agent workflow files are becoming repo artifacts like scripts, CI, and docs.
- Real-time awareness and simultaneous Cascades increase the need for a durable merge/conflict model around AI edits.
- Epoch can differentiate by turning agent workflow invocation, inputs, file access policy, generated changes, and deployment proof into signed history.

## Unknowns To Track

- Windsurf's ownership, packaging, quota model, and model-provider relationships have shifted rapidly since the 2025 acquisition drama.
- App Deploys are described as preview-oriented beta functionality; production guarantees and audit surfaces should be rechecked before treating them as deployment governance.
