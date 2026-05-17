---
product: GUAC
marketing_sources:
  - https://docs.guac.sh/guac/
  - https://openssf.org/blog/2024/03/07/guac-joins-openssf-as-incubating-project/
  - https://openssf.org/blog/2025/06/12/guac-1-0-is-now-available/
---

# Marketing

## Target Customers

- Security teams that need supply-chain visibility across first-party, third-party, and open-source software.
- Platform teams that already generate SBOMs and attestations but need correlation and incident response.
- Organizations adopting OpenSSF supply-chain practices and looking for a shared source of truth.

## Positioning

GUAC positions itself as the graph layer for software supply-chain understanding. The promise is not "another scanner"; it is a normalized view that turns existing metadata into audit, policy, risk, and developer-assistance workflows.

## Customer Model

GUAC is an OpenSSF open-source project. Commercial capture is likely indirect through vendors, consultancies, internal platform teams, and managed security products that operate or embed the graph.

## Captures

- Organizations with enough supply-chain metadata that isolated documents are no longer usable.
- Teams that need to answer transitive impact questions quickly during a vulnerability or compromise event.
- Security programs that want open standards rather than a single vendor's scanner database.

## Misses

- Small teams that do not yet produce SBOMs, attestations, or VEX documents.
- Developers who want a simple source-control workflow rather than a security graph.
- Organizations without the operational appetite to run collectors, graph storage, and visualization services.

## Epoch Lessons

GUAC captures "what does our software supply chain know?" Epoch should capture "which versioned source events and actor decisions created this supply-chain evidence?"
