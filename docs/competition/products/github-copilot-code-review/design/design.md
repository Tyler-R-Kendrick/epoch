---
product: GitHub Copilot Code Review
slug: github-copilot-code-review
design_schema: 1
sources:
  - https://github.com/features/code-review
  - https://docs.github.com/en/copilot/concepts/agents/code-review
  - https://docs.github.com/en/copilot/how-tos/agents/copilot-code-review/using-copilot-code-review
  - https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
---

# GitHub Copilot Code Review Design

## Look And Feel

Copilot Code Review is designed as native GitHub chrome rather than a separate product surface. It appears through pull request reviewers, comments, summaries, editor requests, repository settings, and billing pages. The look inherits GitHub's utilitarian review UI: threaded comments, suggestions, checks, branch state, and account-level usage controls.

## Design References

- Open design docs: no public token package specific to Copilot Code Review was found; it uses GitHub's product shell.
- Screenshots and public docs show Copilot as a selectable reviewer, automatic review setting, and pull request feedback author.
- Billing docs expose review cost as AI Credits plus Actions minutes, making pricing part of the workflow design.

## Differentiators

- Native placement means no extra GitHub App mental model for GitHub-centered teams.
- Automatic review can be set at repository or organization policy level, which turns AI review into a governance primitive.
- Cost and usage controls are integrated into GitHub billing instead of a separate vendor console.

## What Works Well

- Developers can request review without leaving the pull request or editor.
- Copilot's comments sit alongside human review state, required checks, code scanning, and branch protection.
- GitHub can connect review to Actions context, repository permissions, and enterprise controls more directly than most external tools.

## UX Breakdowns

- Review billing is hard to predict because token usage and Actions minutes both matter.
- Automatic review can surprise users if they do not understand when a review run is triggered.
- Product tips, AI attribution, and credit consumption complaints show that users are sensitive to hidden AI action inside trusted GitHub workflows.
