---
competition_schema: 1
product_root: docs/competition/products
generated_by: document-competition
last_researched: 2026-05-07
---

# Competition Research

This directory captures competitive research for Epoch in a stable, parseable layout.

## Paths

```text
product-path: docs/competition/products/<product-slug>
profile-path: <product-path>/profile.md
design-path: <product-path>/design/design.md
features-path: <product-path>/features/*.feature
marketing-path: <product-path>/marketing.md
gossip-path: <product-path>/gossip.md
```

## Product Index

| Product | Primary Competitive Angle | Profile | Design | Features | Marketing | Gossip |
|---|---|---|---|---|---|---|
| GitHub | Default forge and developer collaboration UX | [Profile](products/github/profile.md) | [Design](products/github/design/design.md) | [Feature](products/github/features/repository-collaboration.feature) | [Marketing](products/github/marketing.md) | [Gossip](products/github/gossip.md) |
| Zed DeltaDB | CRDT-backed operation-level version control inside an AI-native collaborative editor | [Profile](products/zed-deltadb/profile.md) | [Design](products/zed-deltadb/design/design.md) | [Feature](products/zed-deltadb/features/operation-level-collaboration.feature) | [Marketing](products/zed-deltadb/marketing.md) | [Gossip](products/zed-deltadb/gossip.md) |
| Dolt | Git-style version control for SQL table data | [Profile](products/dolt/profile.md) | [Design](products/dolt/design/design.md) | [Feature](products/dolt/features/version-controlled-database.feature) | [Marketing](products/dolt/marketing.md) | [Gossip](products/dolt/gossip.md) |
| Unity Version Control | Asset-heavy version control for game and real-time 3D teams | [Profile](products/unity-version-control/profile.md) | [Design](products/unity-version-control/design/design.md) | [Feature](products/unity-version-control/features/asset-heavy-collaboration.feature) | [Marketing](products/unity-version-control/marketing.md) | [Gossip](products/unity-version-control/gossip.md) |
| Radicle | Sovereign peer-to-peer Git forge | [Profile](products/radicle/profile.md) | [Design](products/radicle/design/design.md) | [Feature](products/radicle/features/sovereign-forge.feature) | [Marketing](products/radicle/marketing.md) | [Gossip](products/radicle/gossip.md) |
| Jujutsu | Git-compatible VCS with operation log and first-class conflicts | [Profile](products/jujutsu/profile.md) | [Design](products/jujutsu/design/design.md) | [Feature](products/jujutsu/features/operation-log-and-conflicts.feature) | [Marketing](products/jujutsu/marketing.md) | [Gossip](products/jujutsu/gossip.md) |
| Pijul | Patch-theory DVCS with commutative changes | [Profile](products/pijul/profile.md) | [Design](products/pijul/design/design.md) | [Feature](products/pijul/features/commutative-changes.feature) | [Marketing](products/pijul/marketing.md) | [Gossip](products/pijul/gossip.md) |
| Sapling | Large-scale SCM with user-friendly smartlog and stacked workflows | [Profile](products/sapling/profile.md) | [Design](products/sapling/design/design.md) | [Feature](products/sapling/features/smartlog-and-stacks.feature) | [Marketing](products/sapling/marketing.md) | [Gossip](products/sapling/gossip.md) |
| Graphite | GitHub-native stacked pull request workflow | [Profile](products/graphite/profile.md) | [Design](products/graphite/design/design.md) | [Feature](products/graphite/features/stacked-pull-requests.feature) | [Marketing](products/graphite/marketing.md) | [Gossip](products/graphite/gossip.md) |

## Research Dimensions

Each product folder uses the same sections:

- `profile.md`: concise competitive summary, product model, and Epoch implications.
- `design/design.md`: look and feel, public design system or screenshot references, differentiators, strengths, and UX breakdowns.
- `features/*.feature`: Gherkin descriptions of important user flows.
- `marketing.md`: target customer, positioning, customer model, and excluded audiences.
- `gossip.md`: public sentiment, issue reports, bugs, and adoption friction.

