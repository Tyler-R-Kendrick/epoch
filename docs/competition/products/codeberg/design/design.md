---
product: Codeberg
design_sources:
  - https://codeberg.org/
  - https://docs.codeberg.org/
  - https://forgejo.org/
---

# Design

## Look And Feel

Codeberg uses a Forgejo-style repository interface with a community-hosted brand wrapper. The app surface is a familiar forge: repositories, organizations, issues, pull requests, wiki, packages, releases, and profile pages. The outer identity is more values-driven than commercial: blue branding, nonprofit language, and documentation that explains community rules and contribution.

## Open Design Assets

- The live Codeberg instance is the main screenshot and interaction reference.
- The docs site documents onboarding, pages, CI, packages, and community policies.
- Forgejo's public project and theming surface provide the implementation-level design reference.

## Differentiators

- The differentiating design move is not novel widgets; it is reducing commercial chrome and making the hosting environment feel like a public commons.
- The Forgejo interface keeps GitHub-like affordances while Codeberg's docs and governance copy frame participation as community membership.
- Repository pages look practical and low-distraction, which supports volunteer-maintained projects.

## What Works

- Open-source maintainers get a familiar hosted forge without learning a new review model.
- The values-led design gives projects a reason to move even when the feature set is not larger than GitHub's.
- Documentation foregrounds onboarding, licensing, pages, and contribution norms that matter to public projects.

## UX Breakdowns

- Familiar Forgejo UI means Codeberg does not create a new mental model for versioned intent, signatures, or durable provenance.
- Some advanced users may miss GitHub's marketplace, Actions ecosystem breadth, enterprise integrations, and network effects.
- Values-led positioning can make the product less compelling to private companies that mainly compare feature depth, support SLAs, and compliance controls.

## Epoch Design Lessons

- If Epoch builds a community-facing platform, trust and governance must be legible in the product, not buried in documentation.
- Epoch can differentiate by showing signed history and actor identity as first-class repository facts that hosted Forgejo surfaces do not emphasize.
