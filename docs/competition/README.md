---
competition_schema: 1
product_root: docs/competition/products
generated_by: document-competition
last_researched: 2026-05-06
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

| Product | Primary Competitive Angle | Product Path |
|---|---|---|
| GitHub | Default forge and developer collaboration UX | [`products/github`](products/github/profile.md) |
| Radicle | Sovereign peer-to-peer Git forge | [`products/radicle`](products/radicle/profile.md) |
| Jujutsu | Git-compatible VCS with operation log and first-class conflicts | [`products/jujutsu`](products/jujutsu/profile.md) |
| Pijul | Patch-theory DVCS with commutative changes | [`products/pijul`](products/pijul/profile.md) |
| Sapling | Large-scale SCM with user-friendly smartlog and stacked workflows | [`products/sapling`](products/sapling/profile.md) |
| Graphite | GitHub-native stacked pull request workflow | [`products/graphite`](products/graphite/profile.md) |

## Research Dimensions

Each product folder uses the same sections:

- `profile.md`: concise competitive summary, product model, and Epoch implications.
- `design/design.md`: look and feel, public design system or screenshot references, differentiators, strengths, and UX breakdowns.
- `features/*.feature`: Gherkin descriptions of important user flows.
- `marketing.md`: target customer, positioning, customer model, and excluded audiences.
- `gossip.md`: public sentiment, issue reports, bugs, and adoption friction.

