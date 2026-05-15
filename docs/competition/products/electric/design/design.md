---
product: Electric
design_sources:
  - https://electric.ax/sync/postgres-sync
  - https://electric.ax/sync/postgres-sync
  - https://github.com/electric-sql/electric
---

# Design

## Look And Feel

Electric's current product design is technical, diagrammatic, and systems-oriented. The docs page foregrounds navigation for sync primitives, shapes, writes, installation, security, troubleshooting, benchmarks, and integrations. The product page uses architecture diagrams and shape examples rather than a glossy app console.

## Open Design Assets

- The Postgres Sync docs provide the primary open design artifact: the conceptual diagram from Postgres logical replication to shape logs and clients.
- The docs navigation exposes the product taxonomy around Shapes, writes, sharding, security, troubleshooting, telemetry, and integrations.
- The GitHub repository provides implementation visibility, but Electric does not present a reusable visual design system.

## Differentiators

- The Shape abstraction is a strong information-design move because it maps sync scope to SQL that developers already understand.
- Electric is candid about its boundary: it handles read-path sync, while writes still go through the user's server API.
- The page explicitly includes agents alongside web, mobile, server workers, and services as consumers of real-time updates.
- CDN-cached shape delivery is a clear design answer to high fan-out and large subscriber counts.

## What Works

- The read-path focus keeps the product understandable and reduces invasive backend changes.
- Shape examples make partial replication tangible.
- Existing Postgres stays central, which lowers migration anxiety.
- The docs are structured for production concerns rather than only tutorials.

## UX Breakdowns

- Users must still design the write path, optimistic mutation behavior, conflict handling, and domain validation.
- Shape, logical replication, sharding, and client-store choices can become a lot of infrastructure vocabulary for product teams.
- The public surface is more infrastructure documentation than full workflow UI, so non-infrastructure users may not see an end-to-end product.
- Teams wanting repository history, review, signatures, or policy audit need additional systems.
