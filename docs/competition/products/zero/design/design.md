---
product: Zero
design_sources:
  - https://zero.rocicorp.dev/
  - https://zero.rocicorp.dev/docs/introduction
  - https://zero.rocicorp.dev/docs/introduction
---

# Design

## Look And Feel

Zero's public design is speed-forward and developer-native. The homepage uses a bold performance claim, a large demo callout for a 1.2 million row issue tracker, architecture diagrams, code snippets, and customer quotes. The docs are dense, left-nav technical documentation with clear sections for schema, auth, reading, writing, debugging, deployment, and self-hosting.

## Open Design Assets

- The homepage is the primary product design artifact, especially the architecture diagram and Gigabugs demo framing.
- The docs expose the information architecture for install, tutorial, quickstarts, samples, schema, authentication, ZQL, server integration, inspector, and query analysis.
- The GitHub repository provides source visibility, but Zero does not present a general-purpose open design-system package.

## Differentiators

- Zero's strongest design differentiator is the "queries run against the client first" mental model. It makes local-first performance feel like ordinary React data fetching.
- The product explicitly names the catch in sync engines: preloading too much data and handling permissions. That honesty makes the positioning more credible.
- Pricing is part of the design: open source, self-hostable, managed SaaS, and BYOC are all visible on the same page.
- The docs include debugging affordances such as inspector, query analysis, replication, and query ASTs, which signals production seriousness.

## What Works

- The product promise is immediate: build very fast web apps without custom realtime, cache, and optimistic update machinery.
- Code examples make the UI integration legible.
- The large-row demo is a useful proof point for teams worried that local-first means "toy data."
- Keeping Postgres and normal application code in the story reduces adoption friction.

## UX Breakdowns

- The design is still mostly a developer infrastructure surface, not an end-user collaboration or repository UI.
- ZQL, zero-cache, mutation rules, server authority, and client-store behavior add a product-specific mental model on top of Postgres.
- Early-stage managed onboarding and Discord-oriented support can feel less mature than a standard enterprise database vendor.
- Teams still need to design review, governance, version history, policy, and recovery workflows outside Zero.
