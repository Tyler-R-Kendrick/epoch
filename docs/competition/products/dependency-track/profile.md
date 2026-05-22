---
product: Dependency-Track
slug: dependency-track
category: sbom_vulnerability_management
primary_sources:
  - https://dependencytrack.org/
  - https://docs.dependencytrack.org/usage/policy-compliance/
  - https://docs.dependencytrack.org/integrations/notifications/
  - https://docs.dependencytrack.org/getting-started/monitoring/
---

# Dependency-Track

Dependency-Track is an OWASP continuous SBOM analysis platform. Teams upload CycloneDX SBOMs for projects, then track inherited component risk, vulnerabilities, policy violations, notifications, and portfolio-level metrics over time.

## Competitive Relevance

- Dependency-Track competes with Epoch at the evidence-consumption layer: it turns component inventories into ongoing risk and policy records.
- Its portfolio model makes software supply-chain state visible to security teams after builds and releases.
- Its API-first posture makes it a likely downstream consumer for repository, build, SBOM, VEX, and provenance evidence.
- It captures teams that want risk management around deployed products rather than a new source-control or version-history model.

## Epoch Implications

- Epoch should export materialized-version evidence in forms that SBOM and vulnerability platforms can consume.
- Epoch can differentiate by preserving the source-history and actor-intent trail that explains why a vulnerable component entered, remained, or was removed from a version.
- Dependency-Track shows that users value portfolio rollups, not only per-repository correctness.

## Unknowns To Track

- Dependency-Track's current production fit depends on the user's SBOM generator quality, datasource configuration, and policy tuning.
- VEX and exploitability workflow expectations are still moving across scanners and SBOM platforms.
