---
product: VFS for Git / Scalar
slug: vfs-for-git
category: virtual_partial_git_scale
primary_sources:
  - https://github.com/microsoft/VFSForGit
  - https://github.com/microsoft/VFSForGit/blob/master/Protocol.md
  - https://github.blog/open-source/git/the-story-of-scalar/
  - https://devblogs.microsoft.com/devops/introducing-scalar/
---

# VFS for Git / Scalar

VFS for Git and its successor Scalar are Microsoft's efforts to make Git scale to enormous monorepos (millions of files, hundreds of gigabytes) by fetching and materializing only what a developer actually touches. They are the canonical prior art for "only the files I need" and the strongest external validation of Epoch's targeted partial-checkout direction (ADR-0016).

VFS for Git uses a virtual filesystem (ProjFS on Windows) to make the entire repository appear present on disk. A provider process hydrates a file's content on first open, downloading the object on demand, and Git operations skip un-hydrated files by treating them as unchanged, so status and checkout scale to millions of files. Scalar drops the virtual filesystem entirely and instead composes stock Git features to get most of the same scale benefit in a portable way. Scalar has since been upstreamed into Git itself.

## Competitive Relevance

- The GVFS wire protocol exposes REST endpoints: `GET /gvfs/objects/{oid}` for a single loose object, `POST /gvfs/objects` for a batch (with `commitDepth`, returning a packfile or loose objects), `GET /gvfs/prefetch?lastPackTimestamp=` for packs of non-blob objects enabling incremental history, plus `POST /gvfs/sizes` and `GET /gvfs/config`.
- Cache servers sit near clients to reduce latency and origin load for on-demand object fetches.
- Scalar composes portable Git primitives instead of a filesystem driver: partial clone (`--filter=blob:none`), cone-mode sparse-checkout, background maintenance, commit-graph, and FSMonitor.
- `scalar clone` uses the GVFS protocol where available to fetch a reduced object set with on-demand backfill and a sparse working tree.
- The industry consensus reflected in the Scalar story is that partial clone plus sparse-checkout is the more portable and maintainable path than a bespoke virtual filesystem driver. (Reported reasoning from Microsoft/GitHub engineers; treat as their stated conclusion.)

## Epoch Implications

- This is THE benchmark for "only the files I need." Hydrate-on-open maps directly to Epoch's lazy, on-access chunk hydration (ADR-0016).
- Partial-clone filter plus cone sparse-checkout maps to Epoch's targeted checkout over its virtual working tree (ADR-0014); Epoch can express the fetched set as signed, verifiable events rather than as client-side sparse config.
- The GVFS `prefetch` of non-blob objects (commits, trees, tags) is analogous to Epoch fetching events and manifests without fetching blobs, letting a client reason over history before materializing content.
- The Scalar lesson is a direct design warning for Epoch: prefer a portable partial-clone-plus-sparse approach over a bespoke filesystem driver, because the virtual filesystem carried heavy platform-specific maintenance cost.
- Cache servers near clients suggest Epoch should design its chunk/manifest transfer so that intermediary caches can serve content-addressed objects without breaking signatures.
