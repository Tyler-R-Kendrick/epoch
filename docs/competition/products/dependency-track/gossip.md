---
product: Dependency-Track
gossip_sources:
  - https://github.com/DependencyTrack/dependency-track/issues/4215
  - https://github.com/DependencyTrack/dependency-track/discussions/3988
  - https://www.reddit.com/r/devops/comments/1e65jfu/
  - https://www.reddit.com/r/devsecops/comments/1rtta4v/
  - https://www.reddit.com/r/devsecops/comments/1rx059b/
---

# Gossip

## What People Say

Public discussion is positive when teams discover that SBOM portfolio management is more powerful than basic repository alerts. Users like having a central place for suppression decisions, review dates, project versions, and ongoing risk tracking.

## Bug And Friction Themes

- SBOM ingestion can be confusing when generated files do not map cleanly to expected components or vulnerabilities.
- Policy and VEX workflows can expose schema, parser, and integration mismatch errors.
- Users still struggle with false positives, stale suppressions, and version sprawl unless they build clear triage discipline around the platform.

## Product Risk For Epoch

If Dependency-Track becomes the system of record for component risk, Epoch may be judged by how well it feeds that system instead of by its own source-history model.

## Opportunity For Epoch

Epoch can make Dependency-Track evidence more explainable by linking SBOM entries and risk decisions back to signed source events, actors, reviews, and materialized repository versions.
