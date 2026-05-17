---
product: OpenVEX
marketing_sources:
  - https://github.com/openvex/spec
  - https://github.com/openvex/vexctl
  - https://docs.docker.com/dhi/core-concepts/vex/
---

# Marketing

## Target Customers

- Software producers that need to tell customers whether reported CVEs affect their products.
- DevSecOps teams trying to reduce noisy scanner findings without hiding real risk.
- Tool builders that need a small, embeddable VEX format independent of SBOM representation.

## Positioning

OpenVEX positions itself as a minimal and interoperable way to express vulnerability exploitability. The pitch is that not every dependency CVE is exploitable in every product, and producers need a machine-readable way to communicate that fact.

## Customer Model

OpenVEX is an open specification and tool ecosystem rather than a SaaS product. Commercial value is captured by scanners, vulnerability-management platforms, container vendors, and security teams that consume or emit VEX.

## Captures

- Teams buried under false-positive or non-applicable vulnerability findings.
- Producers that already ship SBOMs and need an accompanying exploitability channel.
- Security automation workflows that need structured risk-acceptance evidence.

## Misses

- Users looking for a full vulnerability-management product.
- Teams that have not defined who is allowed to declare exploitability status.
- Organizations whose scanners do not consume OpenVEX directly.

## Epoch Lessons

OpenVEX captures structured vulnerability judgment. Epoch should connect those judgments to the underlying source history and release evidence that made the judgment credible.
