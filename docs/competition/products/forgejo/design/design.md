---
product: Forgejo
design_sources:
  - https://forgejo.app/
  - https://forgejo.org/docs/
  - https://docs.codeberg.org/getting-started/what-is-codeberg/
---

# Design

## Look And Feel

Forgejo inherits the compact Git forge layout from Gitea: repository navigation, files, commits, issues, pull requests, Actions, packages, and settings. Its brand language is warmer and more community-oriented, with orange Forgejo identity, Codeberg association, and sovereignty messaging around self-hosting and free software.

## Open Design Assets

- Forgejo publishes product and documentation pages but does not present a standalone public design-token system.
- The open-source application itself is the main design artifact for teams customizing the UI.
- Codeberg documentation provides a live hosted reference for how Forgejo can be presented as a public community service.

## Differentiators

- Forgejo's design differentiator is trust framing: the same familiar forge UI is wrapped in community governance and non-commercial infrastructure language.
- Federation appears in the product story as a future UX direction, promising cross-instance collaboration instead of a single hosted network.
- The UI benefits from being familiar enough for Gitea/GitHub users while carrying a stronger free-software identity.

## What Works

- Users can adopt Forgejo without learning a novel interaction model.
- The product makes self-hosting feel politically and operationally coherent for public-interest, EU, nonprofit, and free-software communities.
- Lightweight resource expectations make the product approachable for small servers and community instances.

## UX Breakdowns

- Familiar forge UI means many workflows still feel like conventional Git hosting rather than a new collaboration model.
- Federation messaging can outrun production readiness; the FAQ warns that breaking changes and domain burn risk are possible.
- Governance trust does not automatically produce better review, history, or evidence UX.
- Divergence from Gitea can make compatibility expectations less obvious for administrators and plugin authors.

## Epoch Design Lessons

- Epoch should borrow Forgejo's clarity about sovereignty but make the signed history UX more concrete than a governance promise.
- Epoch should avoid presenting federation as magic; identities, moderation, access control, and broken links need visible product states.
