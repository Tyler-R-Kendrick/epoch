---
product: Graphite
design_sources:
  - https://graphite.dev/
  - https://graphite.dev/features
  - https://graphite.dev/docs/visualize-stack
  - https://graphite.dev/docs/cli-overview
---

# Design

## Look And Feel

Graphite's public design is SaaS-polished and speed-oriented: modern landing pages, product videos, dashboard screenshots, dense PR inbox/status surfaces, and CLI examples. The product combines GitHub-like review views with workflow-specific stack visualization.

## Open Design Assets

- Public marketing site with feature screenshots and videos.
- Docs for CLI stack creation, stack visualization, PR inbox, AI reviews, merge queue, and insights.
- CLI examples showing stack graph output.

## Differentiators

- It visualizes stack dependencies that GitHub does not model well.
- It brings PR inbox, review state, CI, AI review, and merge queue into one workflow layer.
- It keeps GitHub compatibility central rather than trying to replace GitHub.

## What Works

- The product tells a clear story: smaller PRs, faster review, fewer blocked authors.
- CLI and dashboard reinforce each other.
- Status-heavy UI is built for repeated engineering team workflows.

## UX Breakdowns

- The workflow depends on GitHub authentication and branch/PR sync, so it inherits GitHub constraints.
- Stacked PRs add a conceptual layer that can confuse teams used to branch-per-feature.
- Rebase conflicts still fall back to familiar Git conflict resolution states.

