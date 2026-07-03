---
product: OSTree (libostree)
design_sources:
  - https://ostreedev.github.io/ostree/
  - https://ostreedev.github.io/ostree/formats/
  - https://ostreedev.github.io/ostree/repo/
  - https://github.com/ostreedev/ostree
---

# Design

## Look And Feel

OSTree is a library (libostree) with a command-line front end; its "design" is the on-disk repository format and the CLI verbs (commit, pull, checkout, deploy, prune, static-delta). The conceptual surface is a small, Git-like set of objects — file, dirtree, dirmeta, and commit — addressed by SHA-256, with refs as branch pointers. Deployments are checked out from the object store and made bootable, with atomic switch and rollback.

## Open Design Assets

- The OSTree manual, formats reference, and repository documentation specify the object types, checksums, ref layout, and static-delta format.
- The ostreedev/ostree repository is open source, so the object store, static-delta encoding, and pruning logic are fully readable in code.
- The formats page documents the canonical file-object metadata (uid/gid/mode/xattrs) and the dirtree, dirmeta, and commit object structure.

## Differentiators

- Whole-file content-addressed objects with canonical metadata, checksummed with SHA-256, in a Git-like commit/tree model with refs as branches.
- Hardlinked checkouts: identical files across versions and deployments share on-disk storage, giving copy-on-write-like residency for free.
- Static deltas precompute a compact binary update between commits, while a client without a delta simply fetches missing objects from a dumb HTTP server.
- Atomic deployment and rollback of complete bootable trees, with GPG- (and ed25519-) signed commits for authenticity.

## What Works

- Refs as garbage-collection roots (`ostree prune`) are a clean reachability model Epoch can mirror for chunk/pack GC: what no ref reaches is collectable.
- Hardlink checkouts are a proven, low-cost local-residency mechanism — prior art for ADR-0016's materialization story and the Snowtrack reflink lever.
- The dumb-HTTP-plus-static-delta transport shows whole-file and delta distribution can ride commodity infrastructure with no bespoke server, a model for Epoch's transport tiers.
- Signed commits give a working example of authenticating a whole tree state at the ref, which Epoch parallels with signed events.

## UX Breakdowns

- Whole-file objects mean a large file that changes internally re-stores entirely; there is no sub-file dedup, the exact ceiling ADR-0015 Option 2 chunking is chosen to beat.
- OSTree signs the commit, not a per-file content manifest, so authenticity is proven at the root rather than at the granularity of the content structure Epoch's manifest authenticates directly.
- It is an OS-image and deployment system, not a multi-author VCS: there is no merge, review, or collaborative history model, which Epoch must supply.
- Static deltas must be precomputed by the producer; without them, updates fall back to many small object fetches, whereas Epoch's chunk-range transport makes incremental transfer intrinsic.
