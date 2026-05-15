---
product: Electric
slug: electric
category: postgres_read_path_sync_engine
primary_sources:
  - https://electric.ax/sync/postgres-sync
  - https://electric-sql.com/product/sync
  - https://github.com/electric-sql/electric
  - https://github.com/electric-sql/electric/issues
---

# Electric

Electric is an open-source Postgres Sync engine that syncs live subsets of Postgres into local applications, services, embedded databases, and agents. It competes with Epoch when teams want data-local workflows, fast materialized views, and real-time fan-out without adopting a repository-native history model.

## Competitive Relevance

- Electric focuses on the read path: it consumes Postgres logical replication and fans out ordered shape logs to clients.
- Shapes are SQL queries that define exactly which rows a subscriber receives, giving developers a familiar way to scope sync.
- The product explicitly supports local apps, services, web tabs, mobile devices, server workers, and agents as subscribers.
- Electric's architecture works with existing Postgres deployments and leaves writes in the application's own API and business logic.
- Its docs and marketing now connect sync infrastructure to agentic systems, making it adjacent to agent workspaces that need local state.

## Epoch Implications

- Epoch should make its materialized view and named-view story as concrete as Electric's Shape model.
- Electric shows a pragmatic adoption path: do not replace the database, add a sync plane around the current source of truth.
- Epoch can differentiate by preserving signed repository history and multi-artifact identity instead of only streaming current table rows.
- Agent-facing docs should explain how repository state, not just database state, becomes locally available and auditable.
- Electric's CDN-friendly read-path story raises expectations for scale and fan-out proof.

## Unknowns To Track

- How teams handle bidirectional collaboration when Electric deliberately leaves writes to the application.
- Whether shape definitions become hard to govern as permissions and workspace scopes multiply.
- How Electric's reliability sprint and storage-engine hardening translate into production trust across diverse Postgres hosts.
