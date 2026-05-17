---
product: GUAC
gossip_sources:
  - https://github.com/guacsec/guac/issues
  - https://www.reddit.com/r/devsecops/comments/1n0sp6e/
  - https://www.reddit.com/r/devsecops/comments/1syg03m/
---

# Gossip

## What People Say

Public signal is positive among supply-chain security practitioners because GUAC gives a concrete way to use SBOMs and attestations after they are generated. Community discussions around SLSA, GUAC, and supply-chain incidents also show interest in standards-based visibility, but with caution that the security stack can become complex quickly.

## Bug And Friction Themes

- GitHub issues reflect the normal friction of a young, broad integration project: data ingestion, schema coverage, collectors, database behavior, and deployment details.
- Teams can struggle to define which metadata is authoritative when multiple scanners, package managers, and build systems disagree.
- The value is easiest to show during incident response; before an incident, graph maintenance can feel like platform overhead.

## Product Risk For Epoch

GUAC could become the place auditors and security teams expect to inspect software history relationships, reducing the perceived need for a separate repository-history product unless Epoch exports useful evidence.

## Opportunity For Epoch

Epoch can become a high-quality source of repository and materialization facts for GUAC-like systems while providing a more developer-facing workflow for creating those facts.
