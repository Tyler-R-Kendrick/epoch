---
product: restic
slug: restic
category: deduplicating_backup
primary_sources:
  - https://restic.net/
  - https://restic.readthedocs.io/en/stable/100_references.html
  - https://github.com/restic/restic
  - https://github.com/restic/chunker
---

# restic

restic is an open-source backup program written in Go that stores backups in a "repository" — a content-addressed, encrypted object store that can live on local disk, SFTP, a REST server, Amazon S3 / MinIO, Google Cloud Storage, Azure, Backblaze B2, or anything reachable through rclone. Its deduplication engine is content-defined chunking over plaintext with a Rabin fingerprint, and its snapshot/tree/index structure is a close structural analog of Epoch's chunk store plus manifest. It is the clearest prior art for the chunk-store efficiency direction ADR-0015 selected — minus the signatures and history Epoch adds.

## Competitive Relevance

- Deduplication uses content-defined chunking with a Rabin fingerprint (restic's own `chunker` package): boundaries follow content, so an insertion shifts only nearby boundaries and dedup is global across every file and every snapshot in the repository.
- Chunks ("blobs") are variable-sized — roughly 512 KiB minimum, 8 MiB maximum, and approximately 1 MiB average, with the average tuned by a per-repository random polynomial (secondary detail).
- Every blob is content-addressed by SHA-256, the same primitive Epoch's object store already uses.
- Data blobs and tree (metadata) blobs are aggregated into pack files of a few MiB each, each carrying a header that lists the blobs it contains (approximate size, secondary detail).
- Index files map blob ID to (pack, offset, length), so a reader resolves any chunk to its byte range in a pack without scanning.
- A snapshot references a tree; trees reference file contents as ordered lists of blob IDs and reference subtrees — this tree-plus-index is restic's structural analog of Epoch's ordered-chunk manifest.
- Everything is encrypted: a key is derived from the password with scrypt, and blobs are encrypted with AES-256-CTR authenticated by Poly1305-AES. Chunking runs on plaintext and each blob is encrypted afterward, so deduplication is computed on plaintext content, not ciphertext.
- `restic prune` removes blobs no longer referenced by any snapshot and repacks partially-used packs — reachability-based garbage collection with snapshots as roots; repository format v2 added zstd compression.

## Epoch Implications

- restic validates the core of ADR-0015: content-defined chunking (Option 2), loose blobs aggregated into pack files (the packed storage of Option 4), and the reachability-based garbage collection that chunk-level GC will require — all in production against real backup workloads.
- Its chunk-before-encrypt/compress ordering is the concrete answer to ADR-0015's caveat that "boundary-shifting dedup is weaker on compressed or encrypted inputs": chunk the plaintext first, then compress and encrypt each chunk, and dedup survives because the boundaries are computed on content the cipher never sees.
- restic's index (blob ID to pack/offset/length) is a working template for Epoch's chunk assembly index, mapping content-addressed chunks into packs for ranged retrieval.
- The contrast is the whole differentiation: restic's trees and index are not signed and there is no multi-author history or branching, so authenticity rests on holding the repository password. Epoch adds a signed manifest and a signed-event history over the same chunk substrate.
- restic proves the storage efficiency; Epoch keeps the trust model — the signed manifest must cover the ordered chunk list so the whole tree is authenticated, not merely encrypted at rest.
