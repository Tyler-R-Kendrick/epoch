---
product: Depot
design_sources:
  - https://depot.dev/
  - https://depot.dev/docs/cache/overview
  - https://depot.dev/docs/github-actions/overview
  - https://depot.dev/pricing
---

# Design

## Look And Feel

Depot uses a polished, performance-forward developer-tool design: large speed claims, terminal diffs, workflow timing comparisons, product cards, benchmark tables, integration logos, and docs with concrete configuration examples. The experience is intentionally direct: replace the slow command or runner label with a faster Depot equivalent.

## Open Design Assets

- Public marketing pages include UI-like workflow comparisons, live benchmark tables, CI job summaries, and command snippets.
- Public docs describe runner architecture, cache storage, supported tools, retention policy, pricing, and setup flows.
- No public design-token package was found in the reviewed sources.

## Differentiators

- Depot's design communicates speed with side-by-side timing: GitHub Actions versus Depot CI, Docker build versus Depot build, and repository benchmark deltas.
- The product surface is multi-entry: CI engine, container builds, GitHub Actions runners, cache, and API are all presented as pieces of one acceleration platform.
- The docs make cache scope and billing concrete, including retention windows, storage tiers, and per-second usage.

## What Works

- The fastest path is obvious: change `docker build` to `depot build`, switch runner labels, or point a supported build tool at Depot Cache.
- Benchmarks and customer logos make the value proposition legible to both developers and budget owners.
- GitHub Actions compatibility lowers migration cost for teams that are not ready to leave their current workflows.

## UX Breakdowns

- Speed claims can be workload-dependent; container builds that do little real image work may not improve much.
- The platform mixes CI, cache, runners, container builders, and APIs, so teams must understand which product is responsible for which artifact or cost.
- Cache storage and build minutes are usage-billed, which can make cost attribution part of the UX.

## Epoch Design Lessons

- Epoch should present content-addressed reuse with before/after evidence, not only abstract correctness claims.
- Broad integrations matter: users want to keep GitHub Actions, Bazel, Gradle, Turborepo, or sccache while gaining stronger guarantees.
- Cost, retention, and data-control boundaries should be designed into the artifact model.
