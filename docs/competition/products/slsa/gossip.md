---
product: SLSA
gossip_sources:
  - https://github.com/slsa-framework/slsa/issues
  - https://arxiv.org/abs/2409.05014
  - https://www.reddit.com/r/devsecops/comments/1n0sp6e/
---

# Gossip

## What People Say

Public sentiment is respectful because SLSA gives software supply-chain security a shared language. Community discussion also shows skepticism about how easily teams can apply it outside modern cloud CI and package ecosystems.

## Bug And Friction Themes

- GitHub issues and research on SLSA adoption point to documentation clarity, provenance generation, and verification usability as recurring challenges.
- Practitioners can misunderstand what a level proves if they do not separate source, build, artifact, and runtime trust boundaries.
- On-premises and legacy build systems may find the path harder than teams already using hosted CI with provenance generators.

## Product Risk For Epoch

If SLSA becomes the default assurance vocabulary, Epoch will be judged by how well it supports or explains SLSA-compatible source and build evidence.

## Opportunity For Epoch

Epoch can make SLSA source-track evidence easier to produce by preserving actor intent, repository materialization, signatures, and policy decisions in the normal development workflow.
