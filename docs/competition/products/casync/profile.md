---
product: casync / desync
slug: casync
category: content_addressable_sync
primary_sources:
  - https://github.com/systemd/casync
  - https://0pointer.net/blog/casync-a-tool-for-distributing-file-system-images.html
  - https://github.com/folbricht/desync
---

# casync / desync

casync (content-addressable data synchronizer, by Lennart Poettering under the systemd org) distributes filesystem images and directory trees as content-defined chunks stored in a plain-file chunk store, with an index (ordered chunk-hash list) acting as the manifest. desync is a Go reimplementation adding cloud stores and a FUSE mount. Together they are the clearest prior art for Epoch's store-plus-manifest-plus-seed chunked transport direction.

## Competitive Relevance

- casync serializes a directory tree into a reproducible `.catar` stream (tar-like), then applies a buzhash rolling-hash content-defined chunker over the stream with file boundaries removed, so deduplication crosses file boundaries.
- Chunks are zstd-compressed and addressed by SHA-512/256; the index is the ordered list of chunk hashes, which is exactly the manifest.
- File types: `.caibx` is the index for a single blob, `.caidx` is the index for a directory tree (referencing a `.catar`), `.castr` is the chunk store (files named by chunk hash), and `.cacnk` is a compressed chunk.
- Default chunk sizes are min 16 KiB / avg 64 KiB / max 256 KiB (confirmed via desync defaults mirroring casync, secondary detail).
- Because the chunk store and indices are plain files, they serve over HTTP/CDN, S3, or SSH; a client fetches the index and then only the chunks it lacks.
- Seeds: an existing local tree or image is used as a chunk source, so a download reuses on-disk data, which makes A-to-B image deltas cheap.
- desync (by folbricht) reimplements casync in Go, adding S3/SFTP stores, caching, a FUSE mount, and concurrent fetch.
- It is designed for OS/VM/IoT image distribution and backups, not version control: there is no branching or history.

## Epoch Implications

- The store-plus-manifest-plus-seed pattern is almost exactly what Epoch's chunked object store and chunk-range transport want (ADR-0015/0016): an index of chunk hashes is the signed manifest, and the chunk store is the content-addressed backend.
- "Seed from existing local data" maps onto Epoch reusing already-hydrated chunks and a virtual working tree, so a checkout or update only fetches chunks not already on disk.
- The plain-file chunk store served over HTTP/CDN/S3/SSH is a strong model for Epoch's pluggable transport tiers, letting availability ride on commodity infrastructure rather than a bespoke daemon.
- The FUSE mount is a concrete template for lazy, on-access hydration supporting targeted partial checkout: materialize chunks only when a file is actually read.
- Content-defined chunking across file boundaries validates the ADR-0015 move away from whole-file SHA-256 blobs toward CDC for better dedup, though Epoch adds what casync lacks: signed manifests and history/branching.
