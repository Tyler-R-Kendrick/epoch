---
product: GUAC
design_sources:
  - https://docs.guac.sh/guac/
  - https://docs.guac.sh/guac/guac-visualizer/
  - https://github.com/guacsec/guac
---

# Design

## Look And Feel

GUAC is documentation-led with a graph-centered mental model. The public docs use a straightforward technical site, while the main product surface is a mix of CLI queries, APIs, database-backed graph relationships, and the GUAC Visualizer. The visual design is functional: nodes, relationships, searches, and expanded dependency paths matter more than brand polish.

## Open Design Assets

- The docs include screenshots and setup instructions for the GUAC Visualizer.
- The GitHub repositories expose the data model, services, examples, and issue history.
- No formal public design-token package was found; the product design surface is primarily graph exploration and command output.

## Differentiators

- GUAC's strongest design differentiator is the supply-chain graph itself: users navigate relationships instead of reading isolated SBOM or attestation documents.
- Visualizer links from CLI flows help bridge automation and exploration.
- The system makes "unknowns" visible by showing missing or disconnected evidence, not only known vulnerable packages.

## What Works

- A graph is a good fit for transitive dependencies, artifact lineage, and incident response because the user naturally asks follow-up relationship questions.
- The docs present concrete use cases such as vulnerability queries and supply-chain incident analysis instead of only describing the schema.
- Open standards support makes the interface feel like a metadata hub rather than a proprietary scanner.

## UX Breakdowns

- Graph interfaces can become overwhelming when organizations ingest many repositories, packages, versions, and vulnerability documents.
- Running GUAC services, databases, collectors, and the visualizer is a heavier setup than reading an SBOM in an existing scanner.
- The user needs supply-chain vocabulary before the graph becomes actionable; otherwise it can look like a dense network without clear next actions.

## Epoch Design Lessons

Epoch should make history evidence traversable. A repository event should lead to source state, build inputs, artifact attestations, policy decisions, and affected downstream versions without forcing users to manually stitch records together.
