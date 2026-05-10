---
product: Gitea
design_sources:
  - https://about.gitea.com/
  - https://about.gitea.com/products/gitea/
  - https://docs.gitea.com/1.24/category/usage
---

# Design

## Look And Feel

Gitea looks intentionally familiar: repository tabs, file browser, commits, pull requests, issues, projects, packages, actions, labels, milestones, and admin screens resemble the GitHub/GitLab mental model. The product UI favors dense tables, simple icons, compact forms, and conventional forge navigation over a branded workflow language.

## Open Design Assets

- Gitea publishes product screenshots on its official website.
- The documentation exposes the user-facing surface area but does not present a formal public design system or token package.
- The open-source repository and theme customization docs are the practical design references for teams that need branding changes.

## Differentiators

- The differentiator is low-friction familiarity: teams can self-host a GitHub-like experience without learning a new conceptual model.
- Built-in Actions and package registry make the UI feel more complete than a minimal Git server.
- Administrative screens are first-class because self-hosting, backup, email, signatures, mirrors, indexes, and legal pages are core jobs.

## What Works

- The interface is predictable for developers already trained on repository tabs, pull requests, and issue labels.
- Small teams can get code hosting, CI, project boards, and packages without deploying a heavy enterprise suite.
- Self-hosters can customize and operate the stack with straightforward docs and common infrastructure choices.

## UX Breakdowns

- The familiar forge layout also limits differentiation; Gitea can feel like a smaller GitHub clone rather than a new workflow.
- Actions compatibility details create migration traps when users expect every GitHub workflow, annotation, variable, or UI affordance to behave identically.
- Advanced enterprise and compliance workflows are less visually integrated than in GitLab or Atlassian ecosystems.
- The product does not make repository history more semantically rich; signed evidence, intent, and durable agent rationale remain external concerns.

## Epoch Design Lessons

- Epoch should keep lightweight deployment expectations in mind and avoid requiring a heavyweight web platform.
- If Epoch provides a UI, it should expose history semantics that a forge clone cannot: signatures, actor intent, materialized versions, and verifiable event chains.
