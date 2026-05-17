---
product: SLSA
slug: slsa
category: supply_chain_assurance
primary_sources:
  - https://slsa.dev/spec/latest/
  - https://slsa.dev/spec/v1.2/build-track-basics
  - https://slsa.dev/spec/v1.2-rc1/tracks
  - https://github.com/slsa-framework/slsa
---

# SLSA

SLSA, Supply-chain Levels for Software Artifacts, is an OpenSSF specification for incrementally improving software supply-chain integrity. It gives producers, consumers, ecosystems, and infrastructure providers a shared vocabulary for provenance, build hardening, source trust, and verification expectations.

## Competitive Relevance

- SLSA competes with Epoch at the assurance-language layer: it defines what trustworthy source and build evidence should mean.
- Its level model gives security teams a simple maturity ladder, which can be easier to sell than a new repository history system.
- The source track is especially relevant to Epoch because it covers increasing trust in how a source revision was created.
- SLSA shapes the metadata that artifact consumers will expect from CI systems, package registries, and source-control platforms.

## Epoch Implications

- Epoch should map repository history, actor intent, signatures, and materialized versions to SLSA-style source and build provenance expectations.
- Epoch can differentiate by making source-level evidence native to the repository workflow instead of only produced at build time.
- SLSA's broad adoption pressure means Epoch should avoid inventing incompatible trust language unless it offers a clear translation layer.

## Unknowns To Track

- SLSA versions and tracks continue to evolve, so Epoch should track current approved and draft requirements before claiming compatibility.
- Adoption can vary widely by ecosystem because each package manager, CI provider, and organization defines verification mechanics differently.
