---
product: OSTree (libostree)
slug: ostree
category: content_addressed_os_images
primary_sources:
  - https://ostreedev.github.io/ostree/
  - https://ostreedev.github.io/ostree/formats/
  - https://ostreedev.github.io/ostree/repo/
  - https://github.com/ostreedev/ostree
---

# OSTree (libostree)

OSTree (libostree) is an open-source system for versioning and atomically deploying complete bootable filesystem trees — often described as "git for operating system binaries." It backs Fedora Silverblue and CoreOS, Flatpak, Endless OS, and various automotive/embedded images. For Epoch it is the clearest counterpoint to sub-file chunking: a whole-file content-addressed object store whose incremental transport is precomputed static deltas rather than content-defined chunks.

## Competitive Relevance

- OSTree is a content-addressed object store with a small, fixed set of object types checksummed with SHA-256: file objects (regular file content plus canonical metadata — uid/gid/mode/xattrs), dirtree and dirmeta objects describing directories, and commit objects.
- A ref (branch) points to a commit, giving a deliberately Git-like model: commits, trees, and content objects addressed by hash, with branches as movable pointers.
- Objects are whole-file; there is no sub-file chunking. Deduplication is at file granularity — an identical file across versions or trees is stored once.
- On checkout, files are hardlinked from the repository into deployments, so identical files across versions and deployments share on-disk storage, a copy-on-write-like residency without duplicating bytes.
- Static deltas: OSTree can precompute a binary delta between two commits (or from-scratch) so an update downloads a compact delta rather than many loose objects; without a delta a client fetches individual missing objects from a dumb HTTP server.
- OSTree can also bridge to casync (and the "rojig" mechanism) for chunk-based delta distribution, mixing whole-file objects with chunked transport. (Secondary detail; exact integration status varies by version.)
- `ostree prune` garbage-collects objects unreachable from refs, so refs are the GC roots; commits can be GPG-signed (ed25519 signing also exists) so a client verifies commit authenticity.
- Atomic upgrades prepare a new deployment and switch the bootloader, with rollback to the previous deployment — the operational property OSTree is best known for.

## Epoch Implications

- OSTree is the loose-object (ADR-0015 Option 4 loose tier, over the Option 1 whole-file baseline) plus static-delta (Option 3) model — the deliberate counterpoint to Epoch's chosen Option 2 sub-file CDC. It shows the ceiling of whole-file dedup: a large file that changes internally re-stores as a whole new object, exactly the weakness motivating Epoch's content-defined chunking.
- Its hardlink checkouts are working prior art for cheap local residency and copy-on-write materialization, directly relevant to ADR-0016's working-copy model and the Snowtrack reflink idea for fast large-binary checkout.
- Refs as GC roots are a clean, legible model for Epoch's chunk- and pack-level garbage collection: reachability from signed refs decides what survives a prune.
- Static deltas plus the casync bridge show that whole-file and chunked transport are complementary rather than exclusive, informing ADR-0015's chunk-range transport and loose-vs-pack tiering (Option 4).
- Signed commits parallel Epoch's signed events, but OSTree signs the commit, not a per-file content manifest; Epoch's signed Merkle manifest authenticates content structure directly, down to each chunk, rather than trusting a signature at the commit root alone.
