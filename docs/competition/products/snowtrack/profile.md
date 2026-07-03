---
product: Snowtrack (SnowFS)
slug: snowtrack
category: binary_snapshot_vcs
primary_sources:
  - https://github.com/Snowtrack/SnowFS
  - https://dev.to/sebastianrath/snowfs-let-s-bring-version-control-to-graphic-projects-10p8
  - https://news.ycombinator.com/item?id=27432101
---

# Snowtrack (SnowFS)

SnowFS is a version-control file storage layer purpose-built for graphic and binary files, shipped as a CLI plus a Node/TypeScript library. It competes with Epoch on fast local versioning of very large single binaries and on artist-first snapshot ergonomics. It is niche and early-stage, and several internals are not documented in the primary sources, which are flagged below as research gaps.

SnowFS is snapshot-oriented and optimized for very large single binaries (for example multi-gigabyte Photoshop files). It works on plain filesystems (FAT, NTFS, HFS+) and adds extended support for copy-on-write filesystems (APFS, ReFS, Btrfs), which it likely exploits via reflinks/COW for fast checkout. (Inferred from documented COW support; the exact mechanism is not spelled out in the retrieved material.)

## Competitive Relevance

- Benchmarks against Git LFS on a 4 GB Photoshop file: `snow add` about 4.6s vs `git add` about 20s, and `snow checkout HEAD~1` about 77ms vs `git checkout` about 9.7s. (Vendor/author benchmarks; not independently verified.)
- Copy-on-write filesystem support (APFS/ReFS/Btrfs) suggests reflink-based near-instant checkout of large binaries, while plain filesystems are still supported with reduced speed. (Inferred.)
- A content-addressed object store is implied, but the exact chunking and addressing scheme is not documented in the retrieved sources. (Research gap.)
- The hash function is NOT confirmed in the primary docs — do not claim BLAKE3 or any specific algorithm; treat it as unverified. (Research gap.)
- Positioned for graphic/creative projects rather than source code, filling a gap Git and LFS handle poorly.

## Epoch Implications

- COW/reflink-based fast local binary swaps map directly to Epoch's fast local materialization and hydration where the filesystem supports it; ADR-0016 already mentions reflink as a materialization strategy.
- The artist-first snapshot UX aligns with Epoch's creative-asset ambitions; SnowFS shows there is appetite for version control that feels native to designers rather than developers.
- The contrast is governance: SnowFS lacks Epoch's signed multi-author events, policy, and verifiable history — it is a fast local store, not a trust model. Epoch can offer the same local speed plus provenance.
- SnowFS's unverified hash function and undocumented chunking/addressing are research gaps; Epoch should not benchmark against assumed internals, and should note that a verifiable, signed content-addressed model is a clear differentiator over an implied-but-opaque object store.
- The benchmarks, if broadly representative, reinforce that reflink/COW materialization is the right local performance lever for Epoch's large-binary handling.
