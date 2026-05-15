---
product: Zero
slug: zero
category: query_driven_local_first_sync_engine
primary_sources:
  - https://zero.rocicorp.dev/
  - https://zero.rocicorp.dev/docs/introduction
  - https://productlane.com/blog/zero-migration
  - https://github.com/rocicorp/zero
---

# Zero

Zero is Rocicorp's open-source and managed sync engine for instant web applications on normal Postgres schemas. It competes with Epoch where teams want local reads, optimistic writes, cached history, and query-driven synchronization without building a custom repository or sync layer.

## Competitive Relevance

- Zero frames the core problem well: sync engines make apps fast, but broad adoption is blocked by too much data, complex permissions, and static sync boundaries.
- The product combines `zero-cache` in the cloud with `zero-client` in the app, so UI queries hit local normalized data first and then reconcile with server authority.
- ZQL turns sync scope into application queries rather than static tables, which is a strong developer-experience move for large workspaces.
- The Rocicorp lineage from Replicache gives Zero credibility with local-first developers who already know optimistic mutation and sync-engine patterns.
- Managed Zero pricing and BYOC packaging show an enterprise path that pure open-source CRDT libraries often lack.

## Epoch Implications

- Epoch should explain why repository history, signatures, and multi-artifact audit are different from making app data feel instant.
- Query-driven sync is a useful benchmark for Epoch's named views and materialized versions: users should be able to fetch just the view they need without losing provenance.
- Zero's demo-led marketing raises the bar for speed proof; Epoch needs similarly concrete large-repository and offline-recovery demonstrations.
- Epoch can differentiate by treating source, generated assets, policy events, and agent actions as signed history rather than only syncing database rows.
- The strongest overlap is with agent workspaces: Zero makes product state instantly available locally, while Epoch can make repository state and decisions auditable.

## Unknowns To Track

- How the current managed service matures beyond early onboarding and public Discord support.
- How teams handle long-lived offline edits, schema migrations, and deep audit needs when Postgres remains the server authority.
- Whether Zero becomes the default successor to Replicache or remains a high-fit tool for teams willing to adopt a specific query/sync model.
