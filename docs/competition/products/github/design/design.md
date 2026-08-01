---
product: GitHub
design_sources:
  - https://primer.style
  - https://primer.github.io/design/
  - https://github.com/primer
  - https://primer-docs-preview.github.com/product/getting-started/foundations/color-usage/
  - https://primer-docs-preview.github.com/product/primitives/token-names/
---

# Design

## Look And Feel

GitHub's product UI is powered by Primer: a dense, utilitarian, accessible design system with light/dark modes, semantic color roles, Octicons, responsive layouts, and component libraries for Rails, React, CSS, and Figma. Its visual language is intentionally neutral: gray surfaces, blue links and focus states, green success/action states, restrained borders, and compact information hierarchy.

## Open Design Assets

- Primer design system: public guidelines, components, foundations, and patterns.
- Primer primitives: color, typography, and spacing token packages.
- Primer CSS and React: implementation references.
- Octicons: shared icon vocabulary.
- Figma library: public Primer design system package.

## Differentiators

- The design system is unusually complete and production-proven across a massive product surface.
- Semantic tokens make status-heavy collaboration views understandable across light and dark themes.
- Familiar repo, PR, issue, and code browsing patterns reduce switching cost for professional developers.

## What Works

- High information density supports repeated expert workflows.
- Status colors and icon conventions make CI, review, issue, and PR states scannable.
- Public design docs and token packages make the ecosystem easy to emulate.

## Feed Structure (home)

GitHub’s dashboard home is a **contribution-oriented feed**, not a chat room:

- Tabs such as **For you** and **Following** (chronological activity from people/repos you follow).
- Event types: stars, releases, pushes, PR/issue activity — contribution grammar.
- Left rail: repositories and navigation; center: feed; drill-in to repo/issue/PR.
- Density is high and utilitarian (Primer), with status semantics over social theater.

## UX Breakdowns

- Breadth creates chrome overload: non-developers often struggle to distinguish source browsing, releases, clone/download actions, issues, and PRs.
- The repository page optimizes for contributors more than consumers; "Code" as the download/clone entry point is not self-explanatory to casual users.
- Complex org, permissions, Actions, Packages, Copilot, and billing surfaces can feel internally inconsistent despite Primer's shared foundations.
- Feed algorithm changes (“For you”) can bury pure chronological Following activity.

