---
product: Dolt
gossip_sources:
  - https://github.com/dolthub/dolt/issues
  - https://docs.dolthub.com/sql-reference/sql-support
  - https://docs.dolthub.com/sql-reference/sql-support/sql-modes
  - https://docs.dolthub.com/sql-reference/server/troubleshooting
  - https://www.dolthub.com/blog/2024-07-03-why-no-dolt/
  - https://www.dolthub.com/blog/2025-01-02-dolt-mysql-differences/
---

# Gossip

## Positive Sentiment

- Public interest clusters around the clarity of "Git for Data" and the novelty of branchable, mergeable SQL tables.
- Developers praise the direct mapping from Git commands to Dolt commands because it makes demos and onboarding easy.
- The open repository, frequent releases, and candid technical blogs create trust with infrastructure-minded users.

## Complaints And Friction

- Dolt's own "Why People Don't Use Dolt" messaging identifies Postgres compatibility as a major objection.
- SQL support docs expose partial or missing MySQL features, including limited SQL mode support and some statement/function gaps.
- GitHub issues show active reports around version-control correctness, SQL planner behavior, garbage collection, dumps, panics, and bad error messages.
- Troubleshooting docs acknowledge that operational issues often show up as slow SQL queries or unexpected resource use.

## Bug Themes To Watch

- Merge and rebase correctness for schema-plus-data changes.
- MySQL compatibility drift as MySQL authentication, SQL modes, planner expectations, and client behavior evolve.
- Performance and planner quality for complex joins or large tables.
- Operational maintenance such as garbage collection, shutdown recovery, replication, and hosted push reliability.

## Epoch Takeaways

- Be candid about compatibility boundaries; technical buyers punish hidden edge cases more than documented limitations.
- Make history inspection queryable, but avoid forcing every user through SQL.
- Treat merge correctness and error messages as product design, not just engine internals.
- Use simple category language like "Git for Data" while still documenting the exact object model and limits.
