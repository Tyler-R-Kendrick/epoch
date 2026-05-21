# Witness Gossip

## Positive Signals

- Witness is frequently aligned with credible supply-chain standards such as in-toto and SLSA.
- The CLI workflow is understandable to platform teams because it fits into existing CI/CD stages.
- Policy-as-code gives security teams control without hardcoding one vendor's release model.

## Critical Signals

- The product category is still specialist-heavy; many developers will not know why an attestation gate failed.
- Policy authoring and verifier setup can create friction before teams see daily value.
- Evidence collection can feel like another CI wrapper unless the output is surfaced in review, release, and incident workflows.

## Bug And UX Friction Themes

- Verification failures can be hard to interpret when policy, keys, attestations, and CI state all interact.
- CI integration bugs tend to appear as missing materials or products rather than obvious application errors.
- Teams may struggle to decide which build facts deserve policy enforcement versus passive evidence collection.

## Epoch Takeaways

- Epoch should make trust evidence understandable before it reaches an external verifier.
- Exportable attestations matter, but users also need a repository view that explains the human and historical context behind those attestations.
