---
product: Depot
gossip_sources:
  - https://www.reddit.com/r/github/comments/1rhpavo/we_cut_github_actions_build_times_by_6x_with/
  - https://www.reddit.com/r/docker/comments/x5iw4v/building_multiplatform_images_in_ci_without/
  - https://github.com/depot/build-push-action
  - https://depot.dev/benchmark/moby
---

# Gossip

## What People Say

Public chatter is favorable around Depot's speed and ease of migration for slow Docker and GitHub Actions workflows. Reddit discussion frames Depot as a managed alternative to owning persistent builders and runner lifecycle. Depot's own homepage aggregates many social testimonials around major build-time reductions.

## Design And UX Complaints

- Some users question broad speed claims because gains depend on whether the workflow is actually bottlenecked by Docker build work, emulation, cache transfer, or runner cold starts.
- The product can be perceived as "pay someone else for runners and cache" unless the team values the managed lifecycle.
- Multi-product packaging can blur whether a team needs Depot CI, GitHub Actions runners, Depot Cache, remote container builds, or the platform API.

## Feature Complaints

- A Docker subreddit exchange notes that Depot may not improve much when an image build only copies an already-built artifact into a base image.
- Live benchmark pages can show mixed outcomes by commit and workload, including cases where Depot is only modestly faster or slower than the baseline.
- Teams still need to manage authentication, cache retention, cost attribution, and data-control expectations.

## Product Risk For Epoch

Depot proves that speed and cache convenience can pull teams into a third-party build trust path quickly. Epoch should make its stronger history and artifact guarantees available inside existing CI/cache workflows so teams do not have to choose between trust and fast feedback.
