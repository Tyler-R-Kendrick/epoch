---
product: OSTree (libostree)
marketing_sources:
  - https://ostreedev.github.io/ostree/
  - https://ostreedev.github.io/ostree/formats/
  - https://ostreedev.github.io/ostree/repo/
  - https://github.com/ostreedev/ostree
---

# Marketing

OSTree is an open-source project, so its "marketing" is an adoption and positioning narrative carried by the libostree manual, the ostreedev repository, and the downstreams that ship it — Fedora Silverblue/CoreOS, Flatpak, Endless OS, and automotive/embedded images.

## Target Customers

- Linux distributions and appliance vendors that want atomic, image-based OS updates with reliable rollback.
- Flatpak and desktop application delivery reusing OSTree's content-addressed store for deduplicated runtimes and apps.
- Automotive, embedded, and edge fleets needing verifiable, atomically deployed bootable images.
- Teams wanting "git for operating system binaries": versioned filesystem trees with branches and commit-like history.

## Positioning

OSTree is positioned as a system for versioning and atomically deploying complete bootable filesystem trees — "git for operating system binaries." The pitch is safe, transactional whole-OS updates with rollback, built on a content-addressed store that deduplicates at file granularity and distributes updates as compact static deltas over ordinary HTTP.

## Customer Model

- Adoption is open-source and downstream-led: value flows through distributions (Silverblue/CoreOS), Flatpak, and OEM images rather than a hosted service.
- The content-addressed store plus hardlinked checkouts keep multiple deployments cheap on disk, lowering the cost of keeping a known-good rollback.
- Static deltas over dumb HTTP let vendors ship updates from commodity CDN/mirror infrastructure with no special server.
- The casync/rojig bridge extends reach toward chunk-based delta distribution where whole-object deltas are too coarse. (Secondary detail.)

## Captures

- Atomic, rollback-safe OS and appliance updates where a half-applied update is unacceptable.
- Deduplicated application/runtime delivery (Flatpak) sharing a content-addressed store.
- Embedded/automotive fleets needing signed, verifiable bootable images.
- Deployments that want multiple on-disk versions cheaply via hardlink sharing.

## Misses

- Multi-author version control: no merge, review, or collaborative branching model.
- Sub-file deduplication: an internally-changed large file re-stores as a whole new object.
- Per-file content authentication: signing is at the commit, not a per-file manifest.
- Live editing of large assets: OSTree deploys images, it does not stream or edit parts of files.
