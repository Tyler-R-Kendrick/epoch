---
product: Replit Agent
design_sources:
  - https://replit.com/
  - https://docs.replit.com/core-concepts/agent/
  - https://docs.replit.com/learn/build-with-agent
  - https://docs.replit.com/billing/deployment-pricing
  - https://docs.replit.com/cloud-services/deployments/about-deployments
---

# Design

## Look And Feel

Replit Agent is designed as a browser app builder rather than a traditional source-control tool. The core experience blends chat, plan/progress surfaces, file editor, terminal/runtime output, preview pane, checkpoints, and deployment controls into a single web workspace.

## Open Design Assets

- Public docs and marketing pages provide screenshots and guides for Agent, checkpoints, deployment types, publishing costs, and app-building flows.
- Replit does not appear to publish a public reusable design-token package for Agent.
- The public documentation itself is a useful design artifact because it explains the intended checkpoint and recovery workflow for non-expert builders.

## Differentiators

- Replit's design differentiates by collapsing development environment setup, package installation, runtime, AI help, and deployment into one web surface.
- The checkpoint metaphor is prominent and approachable for users who do not think in Git commits.
- Integrated preview and deployment make the agent feel directly connected to a live application outcome.

## What Works

- New users can start from a prompt without installing an editor, runtime, database, or deployment CLI.
- Agent guidance tells users to plan, add context, review, test, and use checkpoints, which is a practical education layer for AI-assisted building.
- Deployment type choices make hosting trade-offs visible inside the same product.

## UX Breakdowns

- Checkpoints can blur together code state, runtime state, deployment state, billing events, and user trust, especially for non-developers.
- Usage-based credits and effort-based agent work can make small fixes feel financially risky when the agent loops or creates repeated checkpoints.
- Hosted convenience can hide environment drift between workspace, published app, secrets, database, and external integrations.

## Epoch Design Lessons

- Epoch should offer a simple recovery story without hiding the difference between source state, runtime state, deployment state, and data state.
- Agent-generated app milestones should become durable signed versions that can be exported and verified outside a hosted workspace.
- Cost and compute evidence should attach to agent trajectories when autonomous work is metered.
