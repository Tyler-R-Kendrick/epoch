---
product: Ona
slug: ona
profile_schema: 1
last_researched: 2026-06-08
sources:
  - https://ona.com/docs/ona/getting-started
  - https://ona.com/stories/the-last-year-of-localhost
  - https://support.gitpod.io/articles/6131188622-accessing-billing-for-gitpod-classic-vs-ona-accounts
  - https://www.theregister.com/2025/09/03/gitpod_rebrands_as_ona/
---

# Ona

Ona, formerly Gitpod, is a background-agent platform built on standardized cloud development environments. It turns the older Gitpod cloud workspace story into an agent execution story: reproducible dev containers, automations, source-control integrations, scheduled or event-driven agents, guardrails, audit logs, and cloud or VPC runner infrastructure.

## Competitive Relevance

- Ona competes with Epoch where a team wants reproducible, policy-governed development sessions for both humans and AI agents.
- Its pitch shifts the CDE category from "remote IDE" to "agent operating platform," making environment reproducibility a prerequisite for trusted agent work.
- Ona's rebrand also shows a market risk: dev-environment tools are being repositioned around AI labor, not only developer convenience.

## Product Model

- Cloud and VPC deployment model for interactive sessions and background agents.
- Environment-as-code setup through Dev Containers and automations.
- Integrations with GitHub, GitLab, issue trackers, editors, secrets, policies, guardrails, and audit logs.
- Credit and subscription billing on the new Ona side, with legacy Gitpod Classic billing separated during the migration.

## Epoch Implications

- Epoch should treat workspace creation, agent execution, and review evidence as one signed chain rather than separate app events.
- The Gitpod-to-Ona transition validates the need for migration-safe identity and history records when a platform changes its product model.
- Epoch can differentiate by making the durable provenance of agent work independent from the workspace vendor that ran it.
