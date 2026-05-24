---
product: Depot
marketing_sources:
  - https://depot.dev/
  - https://depot.dev/pricing
  - https://depot.dev/customers/bastion
  - https://depot.dev/docs/github-actions/overview
---

# Marketing

## Target Customers

- Startups and engineering teams frustrated by slow Docker builds, GitHub Actions cold starts, remote-cache misses, and expensive CI minutes.
- Platform teams that want managed fast runners, persistent builders, distributed cache, and API-driven build infrastructure without owning runner lifecycle.
- AI-heavy development teams whose increased code and build volume makes CI throughput a visible bottleneck.

## Positioning

Depot positions itself as "build faster" infrastructure: faster CI, faster Docker builds, faster GitHub Actions runners, and shared cache, with lower cost through per-second billing and performance-tuned compute.

## Customer Model

- Developer plan for solo developers, side projects, and experiments.
- Startup plan for production teams with larger included minutes and cache.
- Business plan for security controls, custom data retention, custom deployment model, and bring-your-own-compute.
- Usage is billed through build time, Depot CI usage, GitHub Actions minutes, and cache storage.

## Captures

- Teams already on GitHub Actions that want faster jobs without rewriting workflows.
- Container-heavy teams affected by QEMU emulation, cold Docker layer cache, and multi-architecture image builds.
- Teams that want managed performance instead of self-hosting runners and caches.

## Misses

- Teams with already-optimized self-hosted runners, native Arm builders, or tightly controlled build infrastructure.
- Workloads where container build time is not the bottleneck.
- Organizations that require all build compute and cache storage in their own account but are not on a business-tier plan.
