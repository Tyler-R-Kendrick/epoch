---
product: Ellipsis
slug: ellipsis
design_schema: 1
sources:
  - https://www.ellipsis.dev/
  - https://docs.ellipsis.dev/features/code-review
  - https://docs.ellipsis.dev/code
  - https://docs.ellipsis.dev/faq
---

# Ellipsis Design

## Look And Feel

Ellipsis has a founder-led, startup-simple design. The homepage uses direct claims, usage metrics, testimonials, security notes, and pricing without a heavy enterprise shell. The docs use clean navigation and short pages organized by features such as code review, bug fixes, implementation plans, Q&A, workflows, analytics, and code generation.

## Design References

- Open design docs: no public token package or design system was found.
- Screenshots: docs show GitHub review comments, settings, confidence controls, and rules configuration.
- Workflow surface: GitHub comments and reactions are core UI primitives, not just integration details.

## Differentiators

- Ellipsis makes feedback training feel natural by using GitHub reactions and replies.
- Quiet mode and confidence thresholds acknowledge that AI review noise is a product problem, not only a model problem.
- The design promises explicit permission before commits and optional side PRs, which keeps human approval visible.

## What Works Well

- The product is easy to understand: install on GitHub, get reviews, teach it what matters, ask it to fix or explain.
- Flat per-developer pricing is easier to communicate than per-review billing.
- Style-guide-as-code is a strong bridge between human review norms and AI enforcement.

## UX Breakdowns

- GitHub-native simplicity can become a limitation for teams that need first-class GitLab, Azure DevOps, or Bitbucket workflows.
- Teaching the reviewer through reactions is convenient but may be too implicit for regulated policy management.
- The product spans review, bug fixes, Q&A, plans, reports, workflows, and analytics, which could dilute the simple "second pair of eyes" story.
