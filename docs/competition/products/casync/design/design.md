---
product: casync / desync
design_sources:
  - https://github.com/systemd/casync
  - https://0pointer.net/blog/casync-a-tool-for-distributing-file-system-images.html
  - https://github.com/folbricht/desync
---

# Design

## Look And Feel

casync and desync are command-line tools; their "design" is the on-disk format and the CLI verbs (make, extract, mount, list). The conceptual surface is a small set of well-named artifacts: the `.catar` archive stream, the `.caibx`/`.caidx` indices, and the `.castr` chunk store of hash-named `.cacnk` files. desync adds a FUSE mount so an image can be browsed without full extraction.

## Open Design Assets

- The casync README and Lennart Poettering's introductory blog post document the format, chunk store, index files, and seeding model.
- The desync repository documents the Go reimplementation, its store backends (local, S3, SFTP, HTTP), caching, and FUSE mount.
- Both projects are open source, so the `.catar`/`.caibx`/`.caidx`/`.castr`/`.cacnk` formats are fully specified in code.

## Differentiators

- Content-defined chunking (buzhash rolling hash) over a reproducible serialized stream with file boundaries removed, so deduplication crosses files.
- The index is nothing more than an ordered list of chunk hashes, a minimal manifest that doubles as the transfer plan.
- The chunk store is plain files named by hash, so any dumb HTTP/CDN/S3/SSH endpoint can serve it with no special server.
- Seeding from existing local data turns any on-disk tree into a chunk source, making incremental image updates near-free.

## What Works

- The store-plus-index-plus-seed architecture is precisely what Epoch's content-addressed chunk transport wants: an ordered chunk-hash index is the manifest, and the client fetches only missing chunks. Epoch can adopt this almost directly and add signatures over the index.
- Serving chunks from commodity HTTP/CDN/S3/SSH is a clean model for Epoch's pluggable availability/transport tiers, decoupling durability from any bespoke daemon.
- Seeding from local data is exactly the reuse Epoch's virtual working tree and already-hydrated chunks should exploit, so updates transfer minimal bytes.
- The FUSE mount is a working demonstration of lazy on-access hydration, the mechanism Epoch's targeted partial checkout needs.

## UX Breakdowns

- casync has no history, branching, or authorship model; it distributes fixed images. Epoch must supply the signed-event history and multi-author semantics casync deliberately omits, so users cannot mistake efficient sync for version control.
- Integrity is by content hash, but the index is not signed, so authenticity relies on trusting the delivery channel. Epoch's advantage is signing the manifest so the whole tree is authenticated, not just internally consistent.
- Availability is implicit in whatever store hosts the chunks; if a chunk is missing from the store, extraction fails. Epoch should make availability tiers explicit rather than assuming the store is complete.
- The tooling is systems-programmer oriented (CLI, FUSE, image workflows); Epoch needs friendlier materialization UX to bring this power to everyday developer checkouts.
