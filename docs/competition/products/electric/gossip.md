---
product: Electric
gossip_sources:
  - https://github.com/electric-sql/electric/issues
  - https://www.reddit.com/r/reactjs/comments/1crl1z8/building_localfirst_apps_with_react_electricsql/
  - https://www.reddit.com/r/FlutterDev/comments/1dnxt3j/any_good_offline_database_sync_packages_like/
  - https://www.reddit.com/r/ExperiencedDevs/comments/1nm98hu/are_sync_engines_a_bad_idea/
---

# Gossip

## Positive Sentiment

- Local-first discussions regularly include Electric among the serious options for Postgres-backed sync.
- Developers like the idea that existing Postgres data can be sliced into local clients without rewriting the whole backend.
- Recent public messaging around reliability hardening and Postgres primitives makes Electric feel more production-oriented than earlier local-first experiments.

## Complaints And Friction

- Community discussion has noted version shifts and documentation gaps around earlier ElectricSQL generations.
- Because Electric handles the read path, developers still have to reason carefully about write APIs, optimistic UI, permissions, and failure recovery.
- Sync-engine skepticism applies here too: some experienced developers argue that the added complexity is only worth it for apps that truly need offline or instant local state.
- GitHub issues surface practical friction around shape behavior, storage, replication, deployment, and client/runtime edge cases.

## Bug Themes To Watch

- Shape query semantics and performance under many scoped subscriptions.
- Logical replication setup, permissions, and compatibility across hosted Postgres providers.
- Client-store integration with TanStack DB, PGlite, React, and other stacks.
- Operational debugging for lag, sharding, telemetry, and reconnect behavior.

## Epoch Takeaways

- Epoch should separate current-state sync from historical repository guarantees in its positioning.
- SQL-shaped partial materialization is a useful benchmark for Epoch named views.
- Documentation should be explicit about writes, conflicts, and recovery instead of treating sync as magic.
- Agent-local state is now a competitive sync-engine message; Epoch needs a sharper answer for agent-local repository context.
