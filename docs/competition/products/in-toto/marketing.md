---
product: in-toto
marketing_sources:
  - https://in-toto.io/
  - https://www.cncf.io/projects/in-toto/
  - https://github.com/in-toto/in-toto
---

# Marketing

## Target Customers

- Security and platform teams that need formal supply-chain integrity evidence.
- Open-source ecosystems, package managers, and CI/CD providers that want a portable attestation format.
- Enterprises pursuing SLSA-style provenance and policy enforcement.

## Positioning

in-toto positions itself as an open metadata standard and framework for software supply-chain integrity. Its pitch is transparency about what steps happened, who performed them, and whether the final product matches the declared process.

## Customer Model

in-toto is an open-source CNCF project, not a direct SaaS product. Commercial capture happens through integrations, consulting, CI/CD platforms, artifact-security vendors, and enterprise provenance programs that adopt the metadata model.

## Captures

- Buyers who need standards-based provenance rather than another proprietary security dashboard.
- Tool builders who want to emit attestations compatible with the broader SLSA and Sigstore ecosystem.
- Regulated teams that need auditable release evidence.

## Misses

- Developers who want branch, review, or local repository ergonomics.
- Teams without mature CI/CD discipline; the framework cannot create a trustworthy process by itself.
- Users who need approachable visual explanations of failed provenance checks.

## Epoch Lessons

in-toto captures the formal attestation layer. Epoch should capture the human collaboration and source-history layer while making it easy to emit compatible attestations downstream.
