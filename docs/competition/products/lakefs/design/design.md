---
product: lakeFS
design_sources:
  - https://docs.lakefs.io/
  - https://lakefs.io/pricing/
  - https://lakefs.io/blog/lakefs-repository-git-for-data/
  - https://github.com/treeverse/lakeFS
  - https://github.com/treeverse/lakeFS/issues
---

# Design

## Look And Feel

lakeFS presents itself as infrastructure for data engineers: docs-first navigation, architecture diagrams, Git-inspired repository concepts, CLI examples, cloud/storage integration pages, and a web UI for repositories, branches, commits, imports, and governance actions. The design language is practical and enterprise SaaS-oriented rather than visually experimental.

## Open Design Assets

- Public docs expose diagrams for repository concepts, hooks, garbage collection, deployment, and integrations.
- The open repository exposes the application source and issue history, including UI bugs and enhancement requests.
- Marketing and pricing pages use screenshots and feature comparison cards, but there is no standalone public design-token package or formal open design system.

## Differentiators

- The most important design differentiator is not color or layout; it is the direct mapping of data-lake operations to Git nouns that developers and data engineers already understand.
- The flow from branch to test hook to atomic merge makes data promotion feel like code promotion.
- Zero-copy branching and "data stays in place" messaging remove fear that the UI is hiding expensive data movement.

## What Works

- The product makes isolation and rollback concrete for object-storage teams that already understand production data risk.
- Hook and branch-protection concepts give governance teams an enforceable place in the workflow.
- Integrations are surfaced as part of the core story, which reduces anxiety about adopting a separate repository layer.
- The open-source repo plus managed pricing ladder makes technical evaluation and enterprise procurement compatible.

## UX Breakdowns

- lakeFS inherits the complexity of object storage, table formats, Spark jobs, credentials, and Git-style history, so first success can require cross-domain knowledge.
- Garbage collection and retention behavior is subtle because retaining or deleting old objects intersects with branches, imports, shallow copy, compliance, and cost.
- The web UI can expose scale problems common to repository tools, such as long branch, tag, and path names overflowing modal surfaces.
- Users looking for an application-level collaboration workspace may experience lakeFS as a backend control plane rather than a complete product experience.
