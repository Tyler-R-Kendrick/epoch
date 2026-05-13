---
product: GitKraken
design_sources:
  - https://www.gitkraken.com/features/commit-graph
  - https://www.gitkraken.com/features/launchpad
  - https://www.gitkraken.com/features/workspaces
  - https://help.gitkraken.com/gitkraken-desktop/workspaces/
  - https://help.gitkraken.com/gitkraken-desktop/performance-issues/
---

# Design

## Look And Feel

GitKraken uses a polished, high-contrast developer-tool aesthetic centered on dense but visual work surfaces: commit graphs, sidebars, avatars, status chips, change-size bars, branch rows, and PR tables. The design makes Git feel like a cockpit instead of a terminal transcript.

## Open Design Assets

- Public feature pages and help docs include many product screenshots for commit graph, Launchpad, workspaces, PR status, and issue views.
- There is no public design-token package in the reviewed docs.
- The best open design reference is the screenshot corpus in product and help pages, especially graph, workspace, and Launchpad imagery.

## Differentiators

- The commit graph is the anchor: it makes branches, commits, authors, dates, SHAs, change sizes, and right-click actions discoverable in one visual timeline.
- Launchpad turns scattered PR and issue state into a saved, filterable, cross-repository dashboard.
- Workspaces make multi-repo context a shared artifact instead of a personal folder convention.

## What Works

- The graph gives users instant orientation in branch-heavy repositories.
- The UI is opinionated enough to guide novices while still exposing advanced operations like rebase, revert, checkout, compare, conflict resolution, and multi-repo actions.
- The same concepts span desktop, IDE, CLI, and browser surfaces, which reinforces product habit.

## UX Breakdowns

- Dense visual state can become slow or noisy in very large repositories, LFS-heavy projects, or workspaces with many repositories.
- Some collaboration features depend on GitKraken accounts, plan tiers, cloud workspaces, or integrations, so the experience can degrade in air-gapped or privacy-sensitive environments.
- Users who already trust CLI Git may see the visual layer as another stateful system to reconcile when results differ from command-line expectations.

## Epoch Design Lessons

- Epoch should make signed history and causal relationships as scannable as GitKraken makes branch graphs.
- Cross-repository work should be represented as a first-class workspace with safe bulk actions.
- Security-sensitive collaboration features need transparent local/cloud boundaries so trust does not collapse into pricing or telemetry suspicion.
