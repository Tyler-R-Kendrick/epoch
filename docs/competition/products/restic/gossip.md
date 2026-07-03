---
product: restic
gossip_sources:
  - https://restic.net/
  - https://restic.readthedocs.io/en/stable/100_references.html
  - https://github.com/restic/restic
  - https://github.com/restic/chunker
---

# Gossip

As an open-source project, restic's "gossip" is developer sentiment expressed through its GitHub repositories, documentation, and backup-practitioner experience.

## What People Say

- Users praise restic's simplicity: one static Go binary that does encrypted, deduplicated backup with no server to run.
- The content-defined chunker (`restic/chunker`, Rabin fingerprint) is admired for giving global dedup across files and snapshots, so incremental backups transfer only new chunks.
- Client-side encryption by default is widely valued for cloud backends where the storage provider is untrusted.
- The breadth of backends (local, SFTP, REST, S3/MinIO, GCS, Azure, B2, rclone) is called out as making one format work almost anywhere.

## Bug And Friction Themes

- prune and repository maintenance are recurring pain points: reachability GC that repacks partially-used packs can be slow and memory-hungry on large repositories (practitioner sentiment, secondary detail).
- Chunk sizing (approximately 512 KiB min / ~1 MiB avg / 8 MiB max, secondary detail) and the per-repository polynomial affect dedup ratios and are not user-tunable.
- Because everything hinges on one repository password, losing it loses the backup, and there is no per-author key or recovery path.
- Restore and check over very large repositories can be I/O- and memory-intensive.

## Product Risk For Epoch

- restic validates Epoch's chunk-store direction so convincingly that Epoch's differentiation must be crisp: signed manifests, multi-author history, and branching are exactly what restic omits.
- The chunk-before-encrypt ordering is a low-risk, high-value lesson to adopt directly; the risk is failing to sign the resulting ordered-chunk manifest, which would leave Epoch only as authenticated-at-rest as restic.
- restic's prune shows reachability GC is workable but operationally heavy at scale; Epoch should design chunk-level GC and redaction evidence with that cost in mind from the start.
- Because restic's snapshots are unsigned and password-scoped, Epoch's signed-event history is a clear advantage — but only if signing covers the whole manifest and every author's provenance, not just encryption at rest.
