---
product: GUAC
slug: guac
category: supply_chain_graph
primary_sources:
  - https://docs.guac.sh/guac/
  - https://docs.guac.sh/guac/guac-visualizer/
  - https://github.com/guacsec/guac
  - https://openssf.org/blog/2025/06/12/guac-1-0-is-now-available/
---

# GUAC

GUAC, the Graph for Understanding Artifact Composition, is an OpenSSF incubating project that aggregates SBOMs, attestations, vulnerabilities, OpenSSF Scorecard data, VEX, SLSA, in-toto, SPDX, CycloneDX, and other supply-chain metadata into a queryable graph. It is less a source-control product than a security intelligence layer that turns scattered provenance documents into relationships teams can inspect and act on.

## Competitive Relevance

- GUAC competes with Epoch's trust story by making artifact, dependency, source, vulnerability, and attestation relationships visible in one graph.
- Its graph model answers questions Epoch will also need to answer: which source produced this artifact, which dependencies are affected, which attestations exist, and where evidence is missing.
- The OpenSSF home gives it standards credibility and makes it a likely integration target for teams already adopting Sigstore, SLSA, OpenVEX, and in-toto.
- The visualizer and CLI flows show that provenance evidence becomes more useful when users can navigate from a concrete incident to affected artifacts and owners.

## Epoch Implications

- Epoch should export repository and materialization evidence in forms that graph systems can ingest.
- Epoch can differentiate by preserving the versioned human and agent workflow before build-time artifacts exist, then connecting that source evidence to downstream graph analytics.
- GUAC validates that history, identity, dependency, vulnerability, and policy evidence should be correlated rather than left as separate files in CI logs.

## Unknowns To Track

- GUAC's value depends heavily on metadata ingestion coverage and normalization quality.
- The visualizer is useful but experimental, so enterprise product expectations may be set by downstream vendors and custom deployments rather than GUAC itself.
