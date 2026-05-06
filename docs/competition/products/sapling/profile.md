---
product: Sapling
slug: sapling
category: scalable_scm
primary_sources:
  - https://sapling-scm.com/docs/introduction/
  - https://sapling-scm.com/docs/overview/smartlog/
  - https://sapling-scm.com/docs/addons/isl
---

# Sapling

Sapling is Meta's source control system designed for monorepo scale and usability. It competes with Epoch on developer experience around repository state, stacks, navigation, recovery, and large-scale collaboration.

## Competitive Relevance

- Sapling makes smartlog the centerpiece of the user experience.
- It targets Git/Mercurial familiarity while removing sharp edges like explicit branch creation and staging.
- Its internal Meta scale story is strong, but public server and virtual filesystem pieces are not fully available.

## Epoch Implications

- Epoch should treat smartlog as a benchmark for making event graphs and named views understandable.
- Epoch's CLI should provide a concise "what matters now" state view rather than forcing users to compose many commands.

