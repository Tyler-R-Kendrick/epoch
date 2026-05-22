---
product: Dependency-Track
design_sources:
  - https://dependencytrack.org/
  - https://docs.dependencytrack.org/usage/policy-compliance/
  - https://docs.dependencytrack.org/integrations/notifications/
  - https://docs.dependencytrack.org/getting-started/monitoring/
---

# Design

## Look And Feel

Dependency-Track presents as a security operations dashboard and documentation-heavy open-source platform. The public product site emphasizes portfolio metrics, inherited risk, policy violations, and API integrations. The docs are structured around administrator and operator tasks such as uploading BOMs, configuring policies, setting notifications, and monitoring the API server.

## Open Design Assets

- Public product screenshots and diagrams are available on the OWASP project site.
- The documentation exposes the main information architecture: portfolio, project, component, vulnerability, policy, notification, metrics, and API concepts.
- There is no central public design-token package; the product design is best understood through dashboard screenshots, docs navigation, and API object models.

## Differentiators

- The portfolio-first frame turns SBOMs from static files into a continuous monitoring surface.
- Policy compliance is presented as an operational workflow evaluated when SBOMs are uploaded.
- Notifications separate system events from portfolio events, which helps teams wire findings into incident and engineering workflows.

## What Works

- Security teams get a single place to compare projects, inherited risk, vulnerabilities, and policy violations.
- The API-first model is friendly to CI pipelines and platform integrations.
- Monitoring docs acknowledge that the platform itself needs operational observability, not just security output.

## UX Breakdowns

- The dashboard is only as good as imported SBOM identity, component matching, and datasource freshness.
- Users can confuse portfolio metrics, system metrics, policy violations, and scanner findings unless ownership and triage rules are explicit.
- Running the platform can become another piece of infrastructure to tune, upgrade, and debug.

## Epoch Design Lessons

Epoch should make version evidence exportable to SBOM platforms while keeping causal source-history context visible. A good UI would show which source changes, actors, and materialized versions produced the risk state being exported.
