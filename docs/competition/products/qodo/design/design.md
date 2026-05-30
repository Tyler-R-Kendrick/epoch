---
product: Qodo
slug: qodo
design_schema: 1
sources:
  - https://docs.qodo.ai/code-review
  - https://docs.qodo.ai/code-review/migrating-to-qodo-v2
  - https://www.qodo.ai/pricing/
---

# Qodo Design

## Look And Feel

Qodo's current design mixes a polished AI-quality brand with documentation-heavy operational surfaces. The docs are structured around code review, migration, rules, Git integration, and legacy Qodo Merge workflows. Pricing pages emphasize credit allowances, state-of-the-art PR review, and plans for individuals and teams.

## Design References

- Documentation UI: Qodo v2 code-review experience, migration pages, and legacy Qodo Merge / PR-Agent pages.
- Public assets: pricing page and code-quality framework PDF.
- Design tokens: no public token package is advertised.

## Differentiators

- Qodo frames review as a multi-agent experience, which makes automated review feel more like a team of specialists than one bot comment.
- Rule enforcement is integrated into the review story, giving maintainers a governance hook.
- The migration docs acknowledge product evolution instead of hiding the shift from Qodo Merge / PR-Agent to Qodo v2.

## What Works Well

- Pull-request integration meets teams where review already happens.
- The docs clearly describe the new v2 experience and point legacy users toward migration.
- The product's "accuracy without noise" positioning addresses a real complaint about AI review bots.

## UX Breakdowns

- Product renaming and migration from Qodo Merge / PR-Agent can confuse users trying to understand which surface is current.
- Credit-based review pricing can be hard to compare with homegrown review commands or flat-seat agent plans.
- PR comments alone are not durable provenance; they need to be linked to final accepted changes and policy state.
