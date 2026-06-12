---
product: Open SWE
slug: open-swe
design_sources:
  - https://www.langchain.com/blog/introducing-open-swe-an-open-source-asynchronous-coding-agent
  - https://github.com/langchain-ai/open-swe
---

# Design

## Look And Feel

Open SWE's public design is split between LangChain editorial pages, a GitHub repository, and a hosted task UI. The blog uses conceptual diagrams and product screenshots to explain the asynchronous workflow. The repository presents the product as installable infrastructure with documentation-first navigation.

## Open Design Artifacts

- The launch blog includes screenshots of the Open SWE homepage and contribution views.
- The GitHub repository exposes the implementation, deployment instructions, customization surface, issue tracker, and development activity.
- The interaction model centers on a tracking issue, status updates, execution plans, and linked pull requests rather than a permanent IDE canvas.

## Differentiators

- The strongest design differentiator is human-in-the-loop plan control before execution.
- Double-texting while a run is active addresses a common agent UX failure: users often need to add context after they see the agent's direction.
- The product makes architecture part of the UX by showing how GitHub, Slack, Linear, cloud sandboxes, subagents, and PR automation compose.

## What Works Well

- The tracking issue gives asynchronous work a familiar collaboration object.
- Plan accept, edit, delete, or request-changes controls make the agent feel steerable rather than fully opaque.
- GitHub PR output preserves existing review behavior for maintainers.

## Where It Breaks Down

- Framework-first design can overwhelm users who want a ready coding assistant rather than a deployable architecture.
- LangGraph, Deep Agents, hosted sandbox, GitHub App, Linear, Slack, and model configuration create many integration points where setup can fail.
- The visual evidence is still scattered across issue comments, plans, logs, and PRs; it is not a durable independent provenance artifact.
