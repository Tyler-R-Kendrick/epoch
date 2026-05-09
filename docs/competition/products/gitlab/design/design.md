---
product: GitLab
design_sources:
  - https://handbook.gitlab.com/handbook/product/ux/pajamas-design-system/
  - https://docs.gitlab.com/development/fe_guide/design_tokens/
  - https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com
  - https://about.gitlab.com/solutions/source-code-management/
  - https://docs.gitlab.com/user/workspace/
---

# Design

## Look And Feel

GitLab's product UI is dense, administrative, and workflow-heavy. It favors left navigation, tables, sidebars, status widgets, badges, forms, pipeline graphs, issue/MR metadata, and dashboards over a minimal editor-like workspace. The current marketing surface is brighter and more AI-forward, but the application remains a comprehensive DevSecOps console.

## Open Design Assets

- Pajamas is GitLab's open design system for product foundations, components, patterns, tokens, and Figma libraries.
- GitLab documents design tokens as a single source of truth that can be automated into different formats.
- The `design.gitlab.com` project is public and contains GitLab's design-system source and UI component work.
- Product and docs screenshots show merge requests, source-code management, remote workspaces, and governance flows.

## Differentiators

- The design system is not just brand polish; it supports a very broad product surface across GitLab.com, Self-Managed, and Dedicated.
- GitLab's UI can show code, review state, CI, security, compliance, planning, environments, and workspace status in one account model.
- Repository history is visually surrounded by policy and delivery context, which makes GitLab feel like the operational hub for engineering management.

## What Works

- The consistent Pajamas foundation helps a sprawling product remain learnable for enterprise users.
- Status-rich widgets make approvals, failed pipelines, blocked merges, and security findings visible where decisions happen.
- The web IDE and Workspaces flows reduce onboarding friction for contributors who cannot or should not configure local machines.
- GitLab's self-managed product can satisfy organizations that want GitHub-like collaboration without putting code in a third-party SaaS tenant.

## UX Breakdowns

- The same breadth that differentiates GitLab also makes the UI feel heavy for small teams that only need signed history, review, and simple automation.
- Navigation depth and plan-gated controls can make it hard to distinguish core version-control behavior from platform administration.
- Remote Workspaces require Kubernetes and agent setup, so the "develop from the repository" story becomes infrastructure work for administrators.
- Public support and issue history includes performance complaints around slow UI interactions, indexing, and GitLab.com incidents; a rich web console can feel fragile when latency rises.

## Epoch Design Lessons

- Epoch should expose cryptographic history and policy evidence without recreating a full DevSecOps cockpit.
- The UI should bias toward local inspection, narrow workflows, and durable references, then integrate with larger platforms when teams need their governance surfaces.
