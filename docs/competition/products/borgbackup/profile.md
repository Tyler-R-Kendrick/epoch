---
product: BorgBackup
slug: borgbackup
category: deduplicating_backup
primary_sources:
  - https://www.borgbackup.org/
  - https://borgbackup.readthedocs.io/en/stable/internals.html
  - https://borgbackup.readthedocs.io/en/stable/internals/data-structures.html
  - https://github.com/borgbackup/borg
---

# BorgBackup

BorgBackup ("borg") is an open-source deduplicating backup program (Python with C/Cython hot paths), a fork and descendant of Attic. It splits data with a content-defined chunker, then compresses and encrypts each chunk, deduplicating by a keyed chunk id so unchanged data is never re-stored, into an append-only repository under a single-writer lock. It is the clearest prior art for Epoch's chunk-plus-compress-plus-encrypt pipeline (ADR-0015 Option 2) and for the append-only, exclusive-writer model ADR-0016 reaches for.

## Competitive Relevance

- Content-defined chunking uses a **buzhash rolling hash**; chunker parameters are configurable via `--chunker-params` as `(min_exp, max_exp, mask_bits, window_size)`. The historical default is `buzhash,19,23,21,4095` → minimum chunk 2^19 = 512 KiB, maximum 2^23 = 8 MiB, target average tuned by a 21-bit mask (~2 MiB), rolling window 4095 bytes. Borg 2 introduces a faster `buzhash64` (secondary detail; version facts hedged).
- Each chunk is identified by an id derived from its **plaintext** content: an **HMAC-SHA256 keyed hash** when encryption is on, or a plain hash when off. A local **chunk cache** tracks which ids already exist, so unchanged chunks are skipped. Deduplication is global across all archives in a repository and independent of file boundaries and names.
- **Pipeline ordering is chunk → compress → encrypt/authenticate**, applied per chunk after chunking. Compression is lz4 by default (also zstd, zlib, lzma); encryption is AES-256-CTR + HMAC-SHA256 in Borg 1, with AES-OCB and chacha20-poly1305 options in Borg 2. Because the dedup id is a keyed hash of the plaintext chunk, deduplication still works under compression and encryption.
- The **repository is an append-only log of segments** holding chunks; a `manifest` object lists archives, and each archive is a metadata stream referencing chunk ids. Borg supports an **append-only mode** and takes a **repository lock** so only one writer is active at a time.
- Lifecycle is managed by `borg prune` (apply a retention policy over archives) and `borg compact` (rewrite segments to reclaim space from unreferenced chunks); `borg mount` exposes archives over FUSE for browsing and restore.
- Borg is single-repository backup, not version control: there is no branching, no multi-author history, and the manifest is internal repository state rather than a signed, publicly verifiable object.

## Epoch Implications

- Borg confirms ADR-0015 Option 2 (content-defined chunking) and, most importantly, the **chunk → compress → encrypt ordering** that keeps deduplication effective on compressed and encrypted data — the direct, working answer to ADR-0015's "weaker on compressed or encrypted inputs" caveat.
- The **keyed (HMAC-SHA256) chunk id over plaintext** is a concrete pattern for deduplication under confidentiality: identity is computed before compression/encryption, so encrypted chunks still dedup.
- Borg's **append-only mode plus repository lock** are prior art for ADR-0016's opt-in **signed exclusive locks** for unmergeable binaries and for safe single-writer semantics — with the difference that Epoch expresses this as signed lifecycle events, not server-side lock state.
- `prune`/`compact` are prior art for the chunk-level garbage collection and space reclamation ADR-0015 flags as new machinery to build.
- Contrast for differentiation: Borg is single-repository backup, not a multi-author DVCS, and its manifest is not signed or publicly verifiable. Epoch adds signed Merkle manifests and a signed event history on top of the same chunking and dedup substrate.
