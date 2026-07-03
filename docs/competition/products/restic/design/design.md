---
product: restic
design_sources:
  - https://restic.net/
  - https://restic.readthedocs.io/en/stable/100_references.html
  - https://github.com/restic/restic
  - https://github.com/restic/chunker
---

# Design

## Look And Feel

restic is a single-binary command-line tool; its "design" is the repository format and the CLI verbs (init, backup, snapshots, restore, prune, check). The conceptual surface is a small set of content-addressed artifacts: variable-sized blobs produced by content-defined chunking, pack files that aggregate blobs, index files that locate each blob, and snapshots that point at trees. Everything written to the repository is encrypted, so the on-disk form is opaque without the password.

## Open Design Assets

- The restic documentation's references section specifies the repository format, pack and index layout, snapshot/tree structure, and cryptography.
- The `restic/restic` repository is the open-source implementation of the backup engine, repository backends, prune, and check.
- The `restic/chunker` repository is the standalone Rabin-fingerprint content-defined chunker, documenting the min/avg/max chunk sizing and the per-repository polynomial (secondary detail).
- Because the project is open source, the whole format — chunking, packing, indexing, and AES-256-CTR / Poly1305-AES encryption — is fully specified in code and docs.

## Differentiators

- Content-defined chunking with a Rabin fingerprint over plaintext, so deduplication is global across all files and all snapshots and survives insertions that would defeat fixed-size blocks.
- Chunk-before-encrypt ordering: boundaries are computed on plaintext, then each blob is encrypted, so dedup and confidentiality coexist rather than fighting.
- Blob aggregation into pack files with an index mapping blob ID to (pack, offset, length), turning many small chunks into a few efficient objects while keeping random access.
- A wide range of repository backends (local, SFTP, REST, S3/MinIO, GCS, Azure, B2, rclone) over one content-addressed format.

## What Works

- The chunk-store-plus-index-plus-snapshot architecture is almost exactly what ADR-0015's Option 2 describes: content-addressed chunks, packs, an assembly index, and a tree that references ordered chunks. Epoch can adopt this shape and add signatures over the manifest.
- Chunking plaintext and encrypting each chunk afterward is the concrete resolution of ADR-0015's "dedup is weaker on encrypted inputs" caveat, and restic proves it at scale.
- Reachability-based prune (snapshots as roots, repack partially-used packs) is a working model for the chunk-level garbage collection ADR-0015 flags as new machinery to build.
- Serving one content-addressed format across many commodity backends is a clean template for Epoch's pluggable transport and availability tiers.

## UX Breakdowns

- restic has no history model, branching, or authorship: snapshots are independent roots, not a signed multi-author log. Epoch must supply the event history and merge semantics restic omits.
- Integrity is by SHA-256 and authenticity by symmetric encryption, but nothing is signed — anyone with the password can forge a snapshot indistinguishably. Epoch's signed manifest is the missing authenticity layer.
- Confidentiality depends on a single repository password; there is no per-author key or public-key trust. Epoch's signing keys give per-author provenance restic cannot express.
- The tool is operator-oriented (backup/restore CLI), not a working-copy editing surface; Epoch still needs the targeted-checkout and streaming UX of ADR-0016 that restic never attempts.
