---
product: Mercurial
design_sources:
  - https://www.mercurial-scm.org/
  - https://mercurial-scm.org/about.html
  - https://mercurial-scm.readthedocs.io/en/latest/help/topics/phases.html
---

# Design

## Look And Feel

Mercurial's public web presence is documentation-first and traditional: text-heavy pages, simple navigation, quick-start command blocks, and minimal visual branding around the `hg` identity. The product UX is primarily command-line design, not a hosted web app design system.

## Open Design Assets

- Public website and documentation.
- ReadTheDocs help topics for commands and concepts.
- Command-line interaction model, including `hg clone`, `hg add`, `hg commit`, `hg push`, and phase-related configuration.

## Differentiators

- The key design differentiator is conceptual calm. Mercurial presents itself as fast, intuitive, and hard to break.
- Phases are a UX feature as much as a data feature: users get a visible distinction between changes that are public, still draft, or intentionally secret.
- The docs lead with short workflows before deeper theory, making the first run approachable.

## What Works

- The command vocabulary is compact and reads closer to user intent than many Git workflows.
- Conservative defaults around public history reduce accidental shared-history mutation.
- Documentation is direct and stable, which helps users who want a tool rather than a platform.

## UX Breakdowns

- The website and docs feel utilitarian and older, which reinforces the perception that Mercurial is mature but no longer the center of modern developer tooling.
- Users looking for hosted collaboration, rich review UI, CI/CD, package hosting, or social workflows must assemble those elsewhere.
- Mercurial concepts are simpler than Git for some workflows, but they are still a separate mental model from the Git ecosystem most developers already know.

