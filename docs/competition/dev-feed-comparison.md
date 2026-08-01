---
title: Dev feed comparison for Epoch Community Web
compared:
  - x-com
  - bluesky
  - tangled
  - github
  - epoch-community
last_researched: 2026-08-01
---

# Dev Feed Comparison (X · Bluesky · Tangled · GitHub · Epoch)

Channel-only Community Web captured half the product. Competitors treat **home as a feed of network/contribution activity**. Epoch is built on ATProto and must make **observed dev feeds** first-class while keeping the signed repo workshop as the drill-in.

## Competitor home surfaces

| Product | Home | Item grammar | Tabs | Drill-in |
|---|---|---|---|---|
| [X](products/x-com/design/design.md) | Timeline | Posts + action row | Following / For you | Profile, post |
| [Bluesky](products/bluesky/design/design.md) | Soft feed | Posts + soft counts | Following + custom feeds | Profile, thread |
| [Tangled](products/tangled/design/design.md) | Social coding timeline | Verb cards: followed / starred / created | Chronological network | Repo, profile |
| [GitHub](products/github/design/design.md) | Dashboard feed | Contribution events | For you / Following | Repo, issue, PR |
| Epoch (prior) | **#ideas channel** | Chat-like message rows | none | Message tray |

## Steal / refuse

| Steal | Refuse |
|---|---|
| Tangled verb-led coding activity | Timeline-only product (lose channels) |
| GitHub contribution-typed events + Following tab | Algorithmic engagement theater |
| Bluesky feed tabs + handle identity | Generic sky-blue social chrome |
| X hairline scan density | Metric counts as primary UX |
| — | Repo-only shell with no network (prior Epoch gap) |

## Epoch dual-plane thesis

1. **Home = Dev Feed** — ATProto-observed follows, stars, creates, releases, issues, proposals, agent runs.
2. **Drill-in = Repo Workspace** — channels, composer, signed intent tray (existing wedge).
3. **Trust meta stays visible** — sig / atUri / sha256, never fake presence or vanity likes.
4. **Honesty** — live API, local-only graph, or snapshot sample always labeled.

See implementation: [community-web-experience.md](../community-web-experience.md), [DESIGN.md](../../DESIGN.md).

## Evidence

Screenshots: [docs/evidence/design-screenshots/](../evidence/design-screenshots/README.md)
