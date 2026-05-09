---
product: Bitbucket
design_sources:
  - https://www.atlassian.com/software/bitbucket
  - https://atlassian.design/design-system
  - https://atlassian.design/foundations/tokens/design-tokens/
  - https://atlassian.design/foundations/tokens/use-tokens-in-design/
  - https://support.atlassian.com/bitbucket-cloud/kb/something-went-wrong-error-message-when-attempting-to-review-a-pull-request/
---

# Design

## Look And Feel

Bitbucket inherits the Atlassian product language: blue-accented navigation, structured white surfaces, compact tables, pull-request diffs, pipeline status, issue keys, workspace/project hierarchy, and tight links into Jira. Marketing pages are bright, icon-led, and platform-oriented; the product UI is utilitarian and optimized for teams that already understand Atlassian conventions.

## Open Design Assets

- Atlassian Design System documents foundations, components, patterns, Figma resources, and content guidance.
- Atlassian design tokens define colors, typography, elevation, spacing, opacity, and themes such as dark mode and high contrast.
- Bitbucket product pages include current product screenshots for code, CI/CD, AI, and Jira-connected workflows.

## Differentiators

- Bitbucket's design differentiator is ecosystem continuity: Jira issue keys, pull requests, deployments, CI, and project status can feel like one Atlassian workflow.
- Atlassian's design-token system gives Bitbucket a mature accessibility and theming foundation without inventing product-local UI rules.
- Premium governance controls are exposed through familiar workspace and repository administration patterns.

## What Works

- Teams already using Jira can review code without losing planning context.
- Pull request summaries, generated writing help, and Rovo search reduce review setup friction.
- Bitbucket's pricing and UI are approachable for small teams while leaving room for Premium governance.
- The Atlassian Design System makes the product feel consistent with adjacent tools used by non-developer stakeholders.

## UX Breakdowns

- The product can feel less compelling outside Jira/Atlassian-heavy organizations.
- Pull-request review can break down on large diffs; Atlassian support documents cases where the PR diff fails with a "Something went wrong" message.
- SaaS incidents around Pipelines, Git operations, and authentication interrupt the central developer workflow.
- Cross-product navigation creates power for managers but can feel noisy for developers who want a narrow local history tool.

## Epoch Design Lessons

- Epoch should integrate with Jira/Bitbucket references but keep its own event stream simple, local, and inspectable.
- The UI should make signed artifacts and materialized versions easy to reason about without requiring users to traverse a full Atlassian workspace hierarchy.
