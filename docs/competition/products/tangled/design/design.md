---
product: Tangled
design_sources:
  - https://tangled.org/
  - https://docs.tangled.org/
  - https://blog.tangled.org/bobbin/
  - https://blog.tangled.org/newsletter-03/
---

# Design

## Look And Feel

Tangled presents as a modern social forge: activity-first homepage timeline
(stars, follows, creates, forks), handle-centric identity (DIDs visible in
avatars and URLs), and GitHub-familiar repository surfaces (issues, pulls,
pipelines). Marketing emphasizes "tightly-knit social coding," stacked PRs,
self-hostable knots/spindles, web of trust (vouching), and focus-mode inbox
workflows.

## Open Design Assets

- Public web AppView at tangled.org (primary product UI).
- Documentation site and blog (architecture narrative for knots, spindles,
  Bobbin).
- Open monorepo (`tangled.org/core`) including lexicons and service code.
- No separate published design-token system comparable to Epoch's DESIGN.md.

## Differentiators

- **AT identity everywhere**: one account for the "atmosphere," including
  Bluesky handles.
- **Social feed as home**: discovery is timeline-native, not org-dashboard-first.
- **Self-host split**: knots for Git, spindles for CI, AppView for aggregation.
- **Stacking and jj**: native stacked PR narrative for review culture.
- **Bobbin**: API-only, diskless/RAM AppView pattern for third-party clients.

## What Works

- Clear mental model: identity on AT, code on knots, UI aggregates both.
- Low signup friction for existing AT users.
- Self-host story is concrete (NixOS/Docker manuals for knots and spindles).
- Open lexicons make the social data model inspectable (for example via pdsls).

## UX Breakdowns

- Protocol and multi-service topology (PDS + knot + AppView + spindle) raise
  operational questions early for mainstream teams.
- Private repositories and private issues are constrained by public-by-default
  AT records.
- AppView centralization historically conflicted with "run it all yourself"
  expectations; Bobbin mitigates API access but the flagship webview remains a
  product center of gravity.
- Git remains underneath for code, so Git workflow complexity is inherited.

## Epoch Design Takeaways

- Channel-first Community Web can stay Epoch-native; do not abandon human-
  centered channel UX for timeline-only forge patterns.
- Clone URLs and trust signals (signed events, verify state) should be as
  visible as stars/follows when federation is on.
- Keep private/enterprise mode visually and navigationally distinct from
  federated public mode.
