---
product: Dependency-Track
marketing_sources:
  - https://dependencytrack.org/
  - https://owasp.org/www-project-dependency-track/
  - https://docs.dependencytrack.org/usage/policy-compliance/
---

# Marketing

## Target Customers

- DevSecOps and AppSec teams managing SBOMs across many services.
- Regulated organizations that need repeatable software component risk evidence.
- Platform teams that want an open-source, API-first SBOM analysis service.

## Positioning

Dependency-Track positions itself as continuous SBOM analysis rather than a point-in-time dependency scanner. The message is portfolio visibility: upload SBOMs, monitor risk over time, enforce policy, and connect alerts to downstream systems.

## Customer Model

Dependency-Track is an OWASP open-source project. Commercial capture happens indirectly through implementation services, managed environments, support providers, and adjacent SBOM, CI, and security platforms.

## Captures

- Teams that already generate CycloneDX SBOMs and need a central place to manage them.
- Organizations that prefer self-hosted security infrastructure.
- Buyers who need portfolio dashboards and audit trails more than developer-native source-history features.

## Misses

- Small teams that want a zero-admin SaaS scanner.
- Developers who want dependency risk explained inside the code review flow before release.
- Users who need source-control causality, actor signatures, and version materialization to be first-class evidence.

## Epoch Lessons

Dependency-Track captures the post-build evidence hub. Epoch should integrate with that hub but win earlier in the lifecycle by producing trustworthy source and version evidence before an SBOM reaches the portfolio dashboard.
