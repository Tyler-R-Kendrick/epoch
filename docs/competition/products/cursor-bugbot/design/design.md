---
product: Cursor Bugbot
slug: cursor-bugbot
design_schema: 1
sources:
  - https://docs.cursor.com/bugbot
  - https://cursor.com/blog/may-2026-bugbot-changes
  - https://cursor.com/pricing
---

# Cursor Bugbot Design

## Look And Feel

Bugbot's public design is split between Cursor's clean documentation, GitHub pull request comments, and Cursor dashboard settings. The core UX is intentionally narrow: connect GitHub, choose repositories, let Bugbot comment on PRs, then open a finding in Cursor or Cursor web agents.

## Design References

- Open design docs: no Bugbot-specific design system or token package was found.
- Screenshots and docs show GitHub setup, review comments, request IDs, verbose mode, and Fix in Cursor/Fix in Web links.
- Pricing and blog posts expose effort levels as a design control for review depth and cost.

## Differentiators

- The repair path is strong because a finding can open directly inside the Cursor environment.
- Manual trigger comments give maintainers a lightweight control plane without leaving GitHub.
- Effort levels let users trade review depth against spend, which is honest about the cost-quality boundary.

## What Works Well

- Cursor users do not need to copy review comments into another coding assistant.
- The setup model is understandable for GitHub organizations: connect GitHub, enable repositories, review PRs.
- Verbose mode and request IDs help support and debugging when a review behaves unexpectedly.

## UX Breakdowns

- Pricing and effort controls can be hard to find or understand during the migration from seat pricing to usage pricing.
- Automatic review on every PR update can punish iterative workflows when each run has a visible cost.
- Bugbot remains GitHub and Cursor-centered, which limits teams using other forges or editors.
