---
product: in-toto
design_sources:
  - https://in-toto.io/
  - https://in-toto.readthedocs.io/en/stable/
  - https://github.com/in-toto/in-toto
  - https://github.com/in-toto/attestation
---

# Design

## Look And Feel

in-toto's public design is standards-led and documentation-heavy. The website communicates the high-level promise with a foundation-style landing page, while the detailed experience is schemas, command-line tools, Python libraries, layout files, link metadata, and verification commands.

## Open Design Assets

- The public site describes the framework, adoption, integrations, and tooling.
- ReadTheDocs pages document command-line usage and verification behavior.
- GitHub repositories expose the reference implementation, attestation framework, issues, and specification links.
- No product UI design-token package was found for this pass.

## Differentiators

- The core design differentiator is an explicit chain-of-custody model: expected steps are declared in a signed layout and actual steps are captured as signed links.
- The format is open and portable, so other tools can generate, store, and verify evidence without buying a single vendor platform.
- The concept maps naturally to SLSA provenance and artifact policy ecosystems.

## What Works

- The metadata model gives security teams a rigorous vocabulary for materials, products, functionaries, inspections, and verification.
- It is composable with other supply-chain systems instead of trying to own the entire developer workflow.
- Verification can be automated by package managers or CI/CD policy gates.

## UX Breakdowns

- The abstractions can feel academic until a platform wraps them in concrete pipelines.
- Developers may not want to manually reason about layouts, functionary keys, material rules, product rules, and link file placement.
- The standard is powerful but not visually explanatory; teams need dashboards or reports to make failed verification understandable.

## Epoch Design Lessons

Epoch should make its own event and artifact evidence exportable in familiar provenance shapes. A strong visual history UI should still preserve enough structured metadata for in-toto-style automated verification.
