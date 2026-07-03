---
product: Diversion
marketing_sources:
  - https://www.diversion.dev/
  - https://www.diversion.dev/product
  - https://news.ycombinator.com/item?id=39088551
---

# Marketing

## Target Customers

- Game studios working in Unreal and Unity with large binary assets.
- Creative and media teams whose files are big and numerous and who find Git and LFS painful.
- Studios wanting Git-like branching without Git-level complexity or LFS setup.
- Teams that prefer a managed cloud service over self-hosted version-control infrastructure.

## Positioning

Diversion positions itself as a cloud-native version control system built for large files and large teams, where "large files are native" and there are no file-size limits or LFS ceremony. (Vendor/marketing framing.) It emphasizes speed at scale and a serverless architecture that removes infrastructure burden from the user.

## Customer Model

- Delivered as a managed cloud service rather than an open-source tool; capture is through hosting the studio's repositories.
- Every repository operation being a REST call against distributed storage implies a usage- and storage-based cloud business model. (Inferred from vendor description; pricing internals not confirmed here.)
- Adoption is targeted at studios via direct positioning against Perforce, Git, and Git LFS pain.
- Internals are proprietary, so lock-in accrues to the vendor's cloud.

## Captures

- Studios that want large assets to "just work" without LFS configuration.
- Non-expert contributors (artists, designers) who benefit from simplified branching.
- Teams that value fast clone and commit at large scale, per the vendor's performance claims.
- Groups happy to trust a managed cloud for their version control.

## Misses

- Teams needing local-first, offline-capable version control rather than cloud-authoritative operations.
- Organizations requiring verifiable, signed provenance and open, auditable internals.
- Users who want to understand and control how content is chunked, addressed, and stored.
- Buyers wary of vendor lock-in to a proprietary cloud with undocumented internals.
