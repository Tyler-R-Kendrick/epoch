---
product: OpenVEX
slug: openvex
category: vulnerability_exploitability
primary_sources:
  - https://github.com/openvex/spec
  - https://github.com/openvex/vexctl
  - https://github.com/openvex
  - https://docs.docker.com/dhi/core-concepts/vex/
---

# OpenVEX

OpenVEX is a minimal, SBOM-agnostic implementation of Vulnerability Exploitability eXchange. It lets software producers communicate whether known vulnerabilities actually affect a product, usually as JSON-LD documents that can be generated, transformed, attested, and consumed by scanner and policy tooling.

## Competitive Relevance

- OpenVEX competes with Epoch's evidence layer by standardizing a compact statement about vulnerability impact and non-impact.
- It complements SBOMs and provenance systems, which means repository history tools may need to connect source events to later exploitability decisions.
- The `vexctl` tool turns VEX into a developer-operable workflow rather than only a compliance document.
- Scanner support and container-platform usage make OpenVEX part of the practical remediation loop after a dependency or artifact is flagged.

## Epoch Implications

- Epoch should preserve enough version and materialization context to explain why a vulnerability is or is not exploitable in a given source state.
- Epoch can differentiate by linking VEX decisions back to reviewed source changes, agent actions, tests, and release artifacts.
- OpenVEX shows that negative evidence matters: users need durable records of why an alert was dismissed, not only records of detected risk.

## Unknowns To Track

- OpenVEX is still described as draft in the spec repository, so consumers should expect schema and ecosystem behavior to keep evolving.
- Interoperability with scanners and vulnerability-management platforms depends on format support and conversion paths.
