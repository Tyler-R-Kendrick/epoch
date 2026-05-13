---
product: Phorge
design_sources:
  - https://phorge.it/
  - https://projects.clusterlabs.org/book/phorge/article/introduction/
  - https://projects.clusterlabs.org/book/phorge/article/differential/
  - https://secure.phabricator.com/book/phabricator/article/herald/
  - https://secure.phabricator.com/book/phabricator/article/audit/
---

# Design

## Look And Feel

Phorge inherits Phabricator's dense, application-suite design. It is organized around named applications and durable objects: revisions, diffs, commits, tasks, projects, packages, wiki pages, rules, audits, and transcripts. The visual style is less modern SaaS polish and more fast internal-tool portal.

## Open Design Assets

- Phorge and Phabricator documentation expose workflow screenshots and application structure, but no modern public design-token package was found.
- The product's open-source code and live public instances are the practical design references.
- Wikimedia and other long-lived instances provide real-world examples of customized Phabricator/Phorge UX at community scale.

## Differentiators

- Differential makes a proposed change an object with its own lifecycle before it is published.
- Audit handles post-publish review separately, which is rare in GitHub-style PR products.
- Herald gives users and admins rule-based automation for notifications, reviewers, audits, commit blocking, and classification.
- The suite binds code review, repository browsing, task planning, wiki documentation, and ownership policy into one portal.

## What Works

- Power users get fast navigation between related artifacts: revision, task, commit, owner package, audit, and project.
- Test plans and explicit review states encourage reviewers to evaluate verification, not only diff shape.
- Herald transcripts and dry runs make automation more inspectable than many opaque rule systems.

## UX Breakdowns

- The application vocabulary is high-friction for newcomers who expect pull requests and issues.
- Dense pages, many object types, and instance-specific workflows can feel dated or inconsistent.
- Windows and modern IDE integration are weaker than cloud-first or VS Code-native products, and the docs themselves call out Windows integration as a poor fit.

## Epoch Design Lessons

- Epoch should preserve Phorge's best idea: review, audit, ownership, and history events deserve durable identities.
- Epoch should avoid forcing users through too many custom object names before the value is obvious.
- Automation should be explainable with testable transcripts or dry-run evidence, especially for security-sensitive history actions.
