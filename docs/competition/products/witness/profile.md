---
product: Witness
slug: witness
category: supply_chain_attestation
primary_sources:
  - https://witness.dev/
  - https://docs.witness.dev/
  - https://github.com/testifysec/witness
  - https://github.com/testifysec/witness/blob/main/docs/concepts.md
---

# Witness

Witness is an open-source supply-chain security tool from TestifySec for generating and verifying in-toto attestations around build steps, commands, materials, products, and policy decisions. It focuses on evidence collection in CI/CD and policy-based verification before release or deployment.

## Competitive Relevance

- Witness competes with Epoch at the evidence-capture layer: it records what happened during a build or workflow so later systems can decide whether the output is trustworthy.
- Its in-toto alignment positions it as a practical bridge between CI execution and formal supply-chain provenance.
- Policy verification gives teams an enforceable gate without requiring a new repository or version-control surface.
- Witness can make build-time history feel sufficient even if source-level collaboration history is less expressive.

## Epoch Implications

- Epoch should expose signed repository events and materialized versions as attestable facts that Witness-like tools can consume.
- Epoch can differentiate by capturing actor intent and repository state before CI runs, not just the command environment after CI starts.
- Policy failure explanations should be local and developer-facing; Witness shows that opaque provenance gates can otherwise become release friction.

## Unknowns To Track

- Witness adoption appears concentrated among supply-chain security practitioners rather than broad developer teams.
- The user experience depends heavily on CI integration, policy authoring, and verifier ergonomics, which can vary by organization.
