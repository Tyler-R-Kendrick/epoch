---
product: Perkeep (Camlistore)
marketing_sources:
  - https://perkeep.org/
  - https://perkeep.org/doc/
  - https://perkeep.org/doc/schema
  - https://perkeep.org/doc/terms
  - https://github.com/perkeep/perkeep
---

# Marketing

Perkeep is an open-source project, so its "marketing" is the positioning narrative on perkeep.org and in its documentation and GitHub repository, aimed at individuals who want durable control of their own data.

## Target Customers

- Individuals who want a private, long-lived "storage system for life" for photos, documents, and personal archives.
- Self-hosters and privacy-minded users who prefer to keep and index their own data rather than trust a cloud silo.
- Developers and tinkerers comfortable running a personal server and wiring up importers.
- Anyone who wants content-addressed, self-verifying storage with a signed, mutable overlay for organizing it.

## Positioning

Perkeep is positioned as a personal storage system for life: your data, content-addressed, kept for the long term, indexed and searchable, and shareable on your terms. It emphasizes durability and ownership — blobs are immutable and content-addressed, so nothing silently rots or changes — while permanodes and signed claims give you a mutable, organized view over that permanent substrate.

## Customer Model

- Adoption is open-source and self-hosted; the value is the format and the personal server, not a hosted service.
- Pluggable blob backends let users put bytes on local disk or object storage (S3, GCS) they already control.
- Blob-server sync supports replicating a personal store across machines for durability.
- Importers pull data in from third-party services so the personal store becomes the durable copy of a scattered digital life.

## Captures

- Personal archival where permanence and self-verifying integrity matter.
- Users who want to own and index their data instead of renting a cloud silo.
- Content that benefits from dedup and content addressing (photos, documents, backups).
- Organizing immutable content through a signed, mutable permanode/claim overlay.

## Misses

- Multi-author collaboration, review, and branching — it is a personal store, not a VCS or forge.
- Policy and intent governance over how state may change beyond owner-signed claims.
- Deterministic named views and total repository verification of "exactly this state."
- Teams needing explicit availability guarantees rather than best-effort personal replication.
