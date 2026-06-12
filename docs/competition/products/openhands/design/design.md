---
product: OpenHands
slug: openhands
design_sources:
  - https://www.openhands.dev/
  - https://docs.openhands.dev/openhands/usage/run-openhands/github-action
  - https://docs.openhands.dev/enterprise
---

# Design

## Look And Feel

OpenHands presents itself as an agent operations platform rather than a narrow coding assistant. The public site uses dark technical marketing, workflow tiles, customer quotes, diagrams, and product screenshots to signal scale, autonomy, and enterprise readiness. The documentation uses a Mintlify-style sidebar, searchable command palette, and task-oriented pages.

## Open Design Artifacts

- Public pages show product screenshots for cloud workflows, terminal/CLI usage, SDK entry points, and workflow cards such as vulnerability fixes, PR review, migrations, and incident triage.
- The GitHub Action documentation maps the interaction design to GitHub-native actions: create an issue, add a `fix-me` label, comment with `@openhands-agent`, review the resulting pull request, and iterate through comments.
- Enterprise docs make security and control part of the design language: private infrastructure, isolated sandboxes, BYO LLM, SAML/SSO, and auditability.

## Differentiators

- The differentiator is breadth: OpenHands gives one brand to local GUI, CLI, SDK, cloud agents, GitHub resolver, enterprise deployment, and large-codebase orchestration.
- Its design makes "agent as infrastructure" visible, which helps platform teams imagine embedding agents into existing SDLC systems.
- GitHub issue and PR integration lowers adoption friction because the durable review unit remains a pull request.

## What Works Well

- The documentation keeps the GitHub resolver workflow concrete and easy to map into an existing repo.
- Security and deployment controls are visible early, which helps enterprise buyers compare it against purely hosted agents.
- The product site makes extensibility and model choice central instead of burying them as implementation details.

## Where It Breaks Down

- The broad surface can blur the primary user path: individual CLI, cloud UI, SDK builder, and enterprise operator all compete for attention.
- Marketing proof, screenshots, chat transcripts, GitHub events, and runtime logs are still separate objects; reviewers do not get one canonical evidence record.
- The enterprise story depends on correct runtime setup, secrets, identity, and sandbox policy, which can make the first successful agent run more operationally heavy than the website implies.
