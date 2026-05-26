---
product: Windsurf
design_sources:
  - https://docs.windsurf.com/windsurf
  - https://docs.windsurf.com/windsurf/cascade
  - https://docs.windsurf.com/windsurf/cascade/workflows
  - https://docs.windsurf.com/windsurf/cascade/app-deploys
  - https://docs.windsurf.com/windsurf/models
---

# Design

## Look And Feel

Windsurf presents as a VS Code-derived AI IDE with Cascade as the primary side-panel experience. The public docs emphasize mode switching, model selection, todos, queued messages, tool calls, checkpoints, linter integration, workflow panels, and deploy cards. The visual language is productivity-focused and agent-forward rather than forge-like.

## Open Design Assets

- Public docs include screenshots for Cascade, linter handoff, workflows, model selection, and App Deploys.
- Workflows are open markdown artifacts; they are not visual design tokens, but they are inspectable UX/process assets.
- No public standalone design-token package was found in the reviewed sources.

## Differentiators

- Cascade's design centers the "trajectory" rather than an isolated answer. Plans, queued prompts, tool calls, checkpoints, and conversation sharing all frame an agent run as an inspectable sequence.
- Workflow files make reusable agent procedures discoverable through slash commands, giving teams a bridge between docs and automation.
- Real-time awareness reduces prompt bookkeeping by letting Cascade account for nearby editor and terminal actions.

## What Works

- The workflow model is strong for repeatable tasks such as PR review, deployment, dependency maintenance, formatting, tests, and security scanning.
- Named checkpoints make rollback more intentional than purely implicit undo.
- Linter integration and "Send to Cascade" routes existing IDE problem surfaces into agent action.

## UX Breakdowns

- Reverts are irreversible, simultaneous Cascades can race on the same file, and tool-call limits can require paid continues, so autonomy creates both state and cost surprises.
- Memories, rules, workflows, `.codeiumignore`, global settings, and enterprise system workflows create a powerful but complex hierarchy of hidden context.
- Preview deploys can make a public URL feel production-like before secrets, data, tenancy, and rollback are governed.

## Epoch Design Lessons

- Epoch should treat agent workflows as signed, versioned project artifacts.
- If multiple agents can edit concurrently, the history model needs explicit conflict, intent, and merge semantics rather than opaque editor recovery.
- Deployment previews should link back to the exact signed source event and agent trajectory that produced them.
