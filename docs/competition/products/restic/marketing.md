---
product: restic
marketing_sources:
  - https://restic.net/
  - https://restic.readthedocs.io/en/stable/100_references.html
  - https://github.com/restic/restic
  - https://github.com/restic/chunker
---

# Marketing

restic is an open-source project, so its "marketing" is an adoption and positioning narrative carried by restic.net, the documentation, and the GitHub repositories rather than a sales funnel.

## Target Customers

- Individuals and teams needing fast, encrypted, deduplicated backups to local disk or cloud storage.
- Operators who want one backup format that runs against many backends (local, SFTP, REST, S3/MinIO, GCS, Azure, B2, rclone).
- Confidentiality-first users: everything is encrypted before it leaves the machine.
- Workloads with heavy cross-file or cross-snapshot overlap, where content-defined chunking cuts storage and transfer.

## Positioning

restic is positioned as "backups done right": simple, fast, verifiable, secure, and free. The pitch is a single static binary that delivers content-defined deduplication, end-to-end encryption, and a wide choice of storage backends without a server or a subscription. Deduplication and encryption are framed as defaults, not add-ons.

## Customer Model

- Adoption is open-source and self-hosted; the value is the tool and format, not a hosted service.
- Backend flexibility means users ride storage they already run (object stores, SFTP, rclone remotes).
- Content-defined chunking lowers storage and bandwidth cost, which is the core adoption incentive for large or repetitive datasets.
- A single dependency-free binary lowers the barrier to trying and operating it.

## Captures

- Encrypted, deduplicated backup for developers, sysadmins, and self-hosters.
- Cloud-backed backup where per-snapshot overlap makes dedup pay off.
- Confidentiality-first environments that require client-side encryption.
- Multi-backend setups wanting one format across heterogeneous storage.

## Misses

- Version control: snapshots are backup roots, not branching multi-author history.
- Authenticity: nothing is signed, so trust rests on the shared repository password.
- Collaboration, review, and provenance over evolving multi-author content.
- Working-copy editing: restic is a backup/restore tool, not an editable working tree with partial or streamed access.
