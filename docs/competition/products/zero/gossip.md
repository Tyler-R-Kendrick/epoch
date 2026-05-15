---
product: Zero
gossip_sources:
  - https://zero.rocicorp.dev/
  - https://productlane.com/blog/zero-migration
  - https://github.com/rocicorp/zero/issues
  - https://www.reddit.com/r/ExperiencedDevs/comments/1nm98hu/are_sync_engines_a_bad_idea/
  - https://www.reddit.com/r/webdev/comments/1aclqgs/replicache_too_good_to_be_true/
---

# Gossip

## Positive Sentiment

- Public testimonials emphasize shock at the speed improvement and relief from custom frontend state management.
- Productlane's migration narrative reinforces Zero as the next Rocicorp generation after Replicache for production SaaS applications.
- Local-first and sync-engine discussions often treat Zero as one of the most promising current options for serious web apps.

## Complaints And Friction

- General sync-engine discussions keep returning to complexity: permissions, stale offline writes, edge-case conflict handling, schema changes, and operational debugging.
- Some Replicache-era conversations note the transition from Noms to Replicache to Zero, which can create migration and longevity questions for teams choosing a substrate.
- The product is young enough that evaluators may worry about betting core product state on changing APIs, managed-service maturity, and community support channels.
- Teams still need backend write logic, authorization design, and domain-specific conflict behavior.

## Bug Themes To Watch

- Query invalidation and synchronization behavior for complex joins and permissions.
- Replication lag, startup cache correctness, and fallback-to-server behavior.
- Mutator edge cases where optimistic local behavior diverges from server validation.
- Deployment and self-hosting friction around `zero-cache`, Postgres compatibility, and observability.

## Epoch Takeaways

- Epoch should not rely on "local-first" as a differentiator by itself; Zero makes instant local state concrete.
- Signed history, review workflows, and repository-level recovery need to be first-class in Epoch docs and demos.
- Query/materialized-view performance should be shown with large workspaces, not only described.
- Epoch can learn from Zero's frank description of the hard parts in sync adoption.
