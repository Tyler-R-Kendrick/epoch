---
product: Dolt
slug: dolt
category: version_controlled_database
primary_sources:
  - https://docs.dolthub.com/
  - https://docs.dolthub.com/concepts/dolt
  - https://docs.dolthub.com/concepts/dolthub
  - https://docs.dolthub.com/products/hosted/notable-features
  - https://github.com/dolthub/dolt
---

# Dolt

Dolt is a SQL database with Git-style branch, commit, diff, merge, clone, push, and pull semantics for table schema and data. It competes with Epoch where teams want content-addressed history, reviewable changes, reproducible states, and collaboration workflows, but the versioned object is data rather than a code repository.

## Competitive Relevance

- Dolt maps familiar Git commands onto a MySQL-compatible database and exposes version-control state through SQL system tables, functions, and procedures.
- DoltHub adds a hosted collaboration layer for pull requests, web editing, dataset discovery, and public or private remotes.
- DoltLab gives regulated or private teams a self-hosted DoltHub-style surface.
- Hosted Dolt positions the company as an operator of production databases, not only as a developer tool vendor.
- Dolt's "Git for Data" positioning is simple, memorable, and close enough to existing developer mental models to reduce explanation cost.

## Epoch Implications

- Epoch should treat data and generated artifacts as first-class versioned assets, not only source files.
- SQL-queryable history is a strong precedent for agent-facing and operator-facing inspection APIs.
- Dolt's product family shows a useful packaging ladder: local engine, hosted remote, self-hosted collaboration surface, and managed service.
- Epoch can differentiate through signed actor identity, multi-artifact repository events, CRDT collaboration, and language/runtime-neutral SDK surfaces instead of specializing only in relational tables.
- Epoch should be explicit about what can be queried, diffed, reviewed, restored, and merged without depending on a forge UI.

## Unknowns To Track

- How much of DoltHub's collaboration UX is adopted by production teams versus Dolt's CLI/server layer.
- Whether Doltgres reaches enough Postgres compatibility to erase a major objection from Postgres-first teams.
- How operational teams perceive Dolt's write-concurrency, garbage-collection, and MySQL-compatibility trade-offs at scale.
