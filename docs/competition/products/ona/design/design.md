---
product: Ona
slug: ona
design_schema: 1
sources:
  - https://ona.com/docs/ona/getting-started
  - https://www.gitpod.io/assets/style-guide.pdf
  - https://ona.com/stories/the-last-year-of-localhost
---

# Ona Design

## Look And Feel

Ona keeps the clean documentation-heavy Gitpod lineage but moves the product language toward an agent command center. Public docs show a left-navigation information architecture with projects, environments, agents, automations, guardrails, runner infrastructure, billing, and audit topics. The brand surface is minimal and technical, with concise action cards for trying a repository, setting up a team, running background agents, and teaching the agent through repository instructions.

## Design References

- Product documentation: Ona docs expose the main IA for projects, environments, agents, automations, policies, guardrails, and runner infrastructure.
- Brand documentation: Gitpod still publishes a brand style guide, and Ona docs explicitly note the Gitpod-to-Ona transition.
- Product story pages: Ona's public narrative uses simple editorial pages and product diagrams rather than heavy marketing animation.

## Differentiators

- The IA makes agents, environments, and guardrails adjacent first-class concepts instead of hiding agent runtime under a generic IDE.
- The transition banner is unusually explicit: it acknowledges that Gitpod terminology still appears while the product moves to Ona.
- The design emphasizes orchestration and governance more than code-editor chrome.

## What Works Well

- Enterprise operators can quickly infer the control surfaces: runners, policies, guardrails, SSO, audit logs, and billing are visible categories.
- Developers see familiar environment concepts such as dev containers, source control, editors, secrets, and automations.
- The visual restraint keeps the focus on operational trust and agent execution rather than playful AI branding.

## UX Breakdowns

- The Gitpod/Ona transition can confuse users who are trying to find billing, docs, or legacy workspace behavior.
- The product promise spans environment setup, agents, governance, and infrastructure, which can make the first successful path feel broader than a simple "open workspace" flow.
- Credit and usage concepts add cost-planning friction for teams that remember Gitpod primarily as a workspace subscription product.
