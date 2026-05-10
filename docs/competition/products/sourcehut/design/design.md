---
product: SourceHut
design_sources:
  - https://sourcehut.org/
  - https://sourcehut.org/pricing
  - https://docs.sourcehut.org/
---

# Design

## Look And Feel

SourceHut is deliberately austere: text-first pages, sparse navigation, minimal decoration, fast loads, and workflows that remain usable without JavaScript. The product reads more like a public Unix service than a modern SaaS dashboard.

## Open Design Assets

- SourceHut does not market a public design system or token library.
- The live services and documentation are the design reference: simple typography, light pages, direct links, and form-driven workflows.
- SourceHut's core design doctrine is stated in product copy: no tracking, no advertising, all features without JavaScript, and free/open-source software.

## Differentiators

- The no-JavaScript interface is a product-level design claim, not just an accessibility implementation detail.
- Mailing lists, patches, builds, and project pages are composed as separate tools rather than one all-encompassing web app.
- The design prizes speed, transparency, and scriptability over visual polish or rich in-browser interaction.

## What Works

- Pages are fast, readable, and resilient for users who dislike heavy client-side apps.
- Email-native workflows fit maintainers who already use patch queues and mailing lists.
- The minimal UI makes infrastructure values obvious: privacy, control, composability, and low ceremony.

## UX Breakdowns

- Users trained on GitHub-style pull requests may find mailing-list review and patch submission alien.
- The sparse interface can look unfinished to enterprise buyers or less technical contributors.
- Discoverability suffers when features are distributed across many small services.
- No-AI positioning may repel teams that expect agent-generated summaries, code search, or review assistance.

## Epoch Design Lessons

- Epoch should make advanced history inspectable through low-ceremony textual views, not only rich dashboards.
- If Epoch adds agent features, it should preserve a no-magic path where users can audit raw signed events and materialized versions.
