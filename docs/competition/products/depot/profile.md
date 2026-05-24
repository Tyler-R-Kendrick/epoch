---
product: Depot
slug: depot
category: ci_cache_and_remote_build_acceleration
primary_sources:
  - https://depot.dev/
  - https://depot.dev/docs/cache/overview
  - https://depot.dev/docs/github-actions/overview
  - https://depot.dev/pricing
  - https://github.com/depot/build-push-action
---

# Depot

Depot is a CI and build acceleration platform covering Depot CI, remote container builds, GitHub Actions runners, Depot Cache, and build APIs. It competes with Epoch around practical build provenance, cached artifact reuse, CI evidence, and the developer expectation that build systems should be fast, inspectable, and API-driven.

## Competitive Relevance

- Depot Cache provides remote caching for GitHub Actions, Bazel, Go, Turborepo, sccache, Pants, Gradle, Maven, and moonrepo.
- Depot GitHub Actions runners use ephemeral single-tenant EC2 instances, integrated cache storage, second-based billing, and optional business-plan controls such as custom AMIs and egress filtering.
- Remote container builds replace `docker build` with `depot build`, native Intel/Arm builders, persistent SSD layer cache, and GitHub Action compatibility.
- The homepage explicitly markets CI acceleration for AI-era throughput pressure.

## Epoch Implications

- Epoch should assume that teams are increasingly comfortable treating cache and CI vendors as part of the trusted build path.
- Epoch can differentiate by binding cached or materialized outputs to signed history identity, not just to tool-specific cache entries.
- Depot's broad cache support pressures Epoch to make content-addressed storage useful across existing toolchains rather than only in an Epoch-native workflow.

## Unknowns To Track

- Depot CI is expanding quickly; workflow semantics, API surface, and agent-oriented positioning may change.
- Bring-your-own-compute is Business-plan gated, so data-control guarantees vary by customer tier.
