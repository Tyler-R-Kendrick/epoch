---
product: Sigstore
gossip_sources:
  - https://github.com/sigstore/cosign/issues
  - https://github.com/sigstore/rekor/issues
  - https://www.reddit.com/r/devops/comments/1n719lp/
  - https://www.reddit.com/r/rust/comments/108dip0/
---

# Gossip

## What People Say

Public discussion is generally favorable toward the goal of making signing usable, but developers still ask detailed questions about what the identity proves, how Rekor fits into verification, and what happens when an organization cannot use the public transparency log.

## Bug And Friction Themes

- GitHub issues show the normal complexity of a cross-ecosystem signing stack: registry compatibility, verification flags, bundles, certificate identities, Rekor behavior, and CI edge cases.
- Reddit and community discussions often reveal conceptual confusion around keyless signing, public logs, private artifacts, and whether signatures prove enough about the build process.
- Adoption can stall when teams treat signing as a compliance checkbox but do not define policies for which identities, workflows, and attestations are acceptable.

## Product Risk For Epoch

Sigstore could become the default trust vocabulary for developers, making source-history products look incomplete if they do not interoperate with artifact signatures and attestations.

## Opportunity For Epoch

Epoch can complement Sigstore by preserving repository-level event provenance and by exporting evidence that artifact-signing tools can consume during release workflows.
