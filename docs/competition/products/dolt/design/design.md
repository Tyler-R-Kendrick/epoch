---
product: Dolt
design_sources:
  - https://docs.dolthub.com/
  - https://docs.dolthub.com/concepts/dolthub
  - https://docs.dolthub.com/products/hosted/notable-features
  - https://www.dolthub.com/blog/2024-06-03-which-dolt/
  - https://www.dolthub.com/blog/2024-09-24-git-for-data/
---

# Design

## Look And Feel

Dolt's public product design is practical and developer-heavy: documentation pages, Git-like CLI examples, SQL concepts, web database browsing, hosted deployment consoles, and DoltHub repository pages. The visual system borrows heavily from database tooling and GitHub-style collaboration rather than trying to invent a new version-control metaphor.

## Open Design Assets

- Dolt documentation provides architecture diagrams, product screenshots, and screenshots for Hosted Dolt logging and monitoring.
- DoltHub documentation describes the web GUI for database browsing, table editing, generated SQL, pull requests, forums, and cell history.
- Dolt blogs provide product-family diagrams for Dolt, Doltgres, Hosted Dolt, DoltHub, DoltLab, and Dolt Workbench.
- The open Dolt repository exposes the CLI and server behavior, but DoltHub's full hosted web experience is not presented as an open design system.

## Differentiators

- The core design move is conceptual rather than visual: "Git versions files; Dolt versions tables."
- DoltHub lowers the barrier for non-SQL users by making table operations clickable while also showing the generated SQL.
- Cell-level history and reviewable data diffs make provenance inspectable at a smaller unit than a file or commit summary.
- Hosted Dolt adds operational screens for logs, metrics, and configuration, which makes the product feel like infrastructure rather than a research database.

## What Works

- Git-like commands reduce cognitive load for developers who already understand clone, branch, commit, merge, push, and pull.
- SQL access gives power users a composable inspection surface that a bespoke UI would struggle to match.
- The web UI makes collaborative data review concrete: edit data, open a pull request, discuss the diff, and merge to deploy.
- The docs are unusually direct about product boundaries, which helps technical buyers evaluate risk quickly.

## UX Breakdowns

- Dolt inherits two complex mental models at once: Git history and relational database operations. That is powerful for experts but heavy for casual users.
- MySQL compatibility limitations create UX ambiguity because users may not know whether a failure is their query, MySQL dialect drift, or Dolt-specific behavior.
- DoltHub-style collaboration is strongest for tabular data; mixed source, binary, generated, and policy artifacts need a broader repository model.
- Users who prefer Postgres, document databases, or event-sourced application stores may see the MySQL-first surface as a migration cost.
