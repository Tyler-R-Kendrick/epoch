---
product: Azure Repos
design_sources:
  - https://fluent2.microsoft.design/
  - https://fluent2.microsoft.design/design-tokens
  - https://fluent2.microsoft.design/color
  - https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
  - https://learn.microsoft.com/en-us/azure/devops/repos/git/repository-settings?view=azure-devops
---

# Design

## Look And Feel

Azure Repos inherits the Azure DevOps web shell: dense enterprise navigation, left-side service rail, table-heavy repo and branch lists, configuration panels, command bars, and status badges. Public Microsoft design references point to Fluent 2: neutral surfaces, Microsoft brand blues, semantic status colors, accessible states, icons, Figma UI kits, and global/alias design tokens for color, typography, spacing, elevation, stroke, and radius.

## Open Design Assets

- Fluent 2 design system, including web UI kits and design token guidance.
- Fluent UI React and web component libraries.
- Microsoft Learn pages with product screenshots for Branches, Branch Policies, repository settings, reviewer policies, build validation, and bypass permissions.

## Differentiators

- Governance UI is concrete. Admins can see branch policies, path filters, file-size policies, reviewer rules, build validation, and bypass permissions as first-class settings rather than hidden repo conventions.
- Microsoft ecosystem continuity is strong: Azure Boards, Pipelines, Artifacts, Entra identity, Visual Studio, and GitHub Enterprise licensing all feel like adjacent rooms in the same building.

## What Works

- Policy forms make enterprise controls discoverable to administrators who do not want to encode everything in custom hooks.
- Fluent semantic colors and neutral density are well suited to status-heavy PR and compliance screens.
- Browser and CLI paths are documented side by side, which helps platform teams automate after learning the UI.

## UX Breakdowns

- Azure DevOps can feel like many products sharing one shell rather than one focused repository tool. Repos, Boards, Pipelines, billing, project settings, organization settings, and repository policies create a deep navigation stack.
- Terminology overlaps are a recurring source of friction: work items, linked items, related work, branch policies, repository policies, optional requirements, required requirements, and bypass permissions require careful reading.
- The design optimizes administrator completeness over contributor calm. A developer who only wants to understand why a PR cannot merge may have to decode several policy layers.

