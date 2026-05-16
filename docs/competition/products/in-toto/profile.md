---
product: in-toto
slug: in-toto
category: supply_chain_attestation
primary_sources:
  - https://in-toto.io/
  - https://in-toto.readthedocs.io/en/stable/
  - https://in-toto.readthedocs.io/en/stable/command-line-tools/in-toto-verify.html
  - https://github.com/in-toto/in-toto
---

# in-toto

in-toto is a CNCF graduated framework and metadata standard for protecting software supply-chain integrity. Project owners define signed layouts that describe required steps, authorized functionaries, and artifact rules; functionaries generate signed link metadata; verifiers check that the delivered product followed the expected chain.

## Competitive Relevance

- in-toto competes with Epoch's end-to-end evidence story by defining portable metadata for who did which supply-chain step and what artifacts changed.
- It is a standard-shaped competitor: even if users never install a visible app, they may adopt in-toto attestations through package managers, CI systems, SLSA generators, and policy tools.
- The layout and link model overlaps with Epoch's need to preserve actor, artifact, and version evidence.
- CNCF graduation gives it ecosystem legitimacy for security buyers.

## Epoch Implications

- Epoch should understand in-toto attestations as a likely interchange format for build, release, and provenance evidence.
- Epoch can differentiate by covering source-history and collaboration events before build-time attestation begins.
- The product should avoid inventing isolated provenance formats where in-toto-compatible export would satisfy buyers faster.

## Unknowns To Track

- End-user experience depends on the tools generating and consuming in-toto metadata.
- Layout authoring can be too abstract unless wrapped by domain-specific CI/CD workflows.
