---
product: Socket
design_sources:
  - https://socket.dev/features
  - https://socket.dev/features/github
  - https://docs.socket.dev/
  - https://docs.socket.dev/docs/package-issues
  - https://socket.dev/pricing
---

# Design

## Look And Feel

Socket has a modern developer-security SaaS design. The public product pages use sharp threat language, package examples, pricing cards, and integration paths. The docs use a searchable developer-documentation layout with GitHub App, CLI, API, configuration, alert, and organization concepts.

## Open Design Assets

- Public product pages show GitHub PR, package, alert, and pricing surfaces.
- Docs describe alert categories, severity models, bot commands, organization alerts, and configuration fields.
- No public design-token system is central; the strongest design references are product screenshots, docs IA, and the package-search experience.

## Differentiators

- Socket markets package behavior analysis and supply-chain risk detection before an advisory exists.
- PR comments and checks make security feedback appear exactly where dependency changes are reviewed.
- Pricing and packaging emphasize developer count, scan volume, reachability, alerts, SBOM import/export, SSO, and enterprise reachability.

## What Works

- Developer workflow placement is strong: install the GitHub App and get pull-request feedback.
- Alert categories are broader than CVEs, covering malware, typosquats, install scripts, privileged APIs, maintenance, quality, and license signals.
- Reachability positioning directly addresses the common complaint that scanners create too many irrelevant CVEs.

## UX Breakdowns

- Blocking PR checks can frustrate teams if risk scores are hard to explain or suppress.
- The product can feel opaque when proprietary analysis flags package behavior without enough local evidence.
- Some controls require tier decisions, which can split the experience between open package search, team automation, and enterprise reachability.

## Epoch Design Lessons

Epoch should bring dependency-risk evidence into code-review and version-history timelines. The UI should explain why a package decision was allowed, blocked, or overridden, and keep that explanation attached to the materialized version.
