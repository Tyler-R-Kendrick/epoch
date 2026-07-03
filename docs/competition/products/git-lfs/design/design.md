---
product: Git LFS
design_sources:
  - https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-smudge.adoc
---

# Design

## Look And Feel

Git LFS has no product UI of its own; its "design" is a command-line and configuration experience layered onto Git. Users interact with it through `git lfs track`, entries in `.gitattributes`, and the ordinary `git add`/`git commit`/`git push`/`git checkout` verbs, which transparently invoke the clean and smudge filters. The intended feel is invisibility: large files should behave like normal Git files while the bytes move separately.

## Open Design Assets

- The Git LFS specification documents the pointer-file format (`version`, `oid sha256:<hex>`, `size`) as a stable, human-readable text contract.
- The Batch API documentation defines the JSON request/response shape for negotiating transfers, which serves as the integration surface hosting providers implement.
- The smudge and filter-process manual pages document the checkout-time expansion protocol, including the long-running `filter.process` mode that avoids per-file process spawn.
- There is no published visual design system or design-token library; the assets are specs, man pages, and reference client code.

## Differentiators

- The pointer file is the central design idea: a tiny, diffable, Git-tracked text stand-in for arbitrarily large content, keyed by SHA-256.
- Configuration-as-behavior via `.gitattributes` means large-file handling is declared per path and travels with the repository.
- The Batch API cleanly separates identity negotiation from raw transfer, letting hosts plug in their own storage and CDNs behind a standard protocol.

## What Works

- Deep Git nativeness means almost no new mental model: the same verbs work, so adoption friction is low.
- Pointer files are transparent and inspectable, so users and tools can reason about what a large-file version points to.
- Path-scoped fetch controls (`GIT_LFS_SKIP_SMUDGE`, fetchinclude/exclude, `git lfs pull --include=`) give a working, if manual, form of "only the files I need." This is the same targeted-checkout instinct Epoch aims to make first-class (ADR-0016) — Epoch's opportunity is to make it verifiable and automatic over its content-addressed working tree rather than config-driven.
- Optional locking provides a real, if bolt-on, answer to concurrent binary edits, foreshadowing Epoch's signed binary-edit exclusive locks.

## UX Breakdowns

- No delta between versions means churny binaries silently bloat the object store, and users often discover the cost only when clones or pushes become slow.
- Pointer/merge friction is a recurring pain: a mis-installed filter, a missing `.gitattributes` entry, or a bad checkout leaves the literal pointer text in the working tree instead of the file.
- Partial fetch is powerful but manual and easy to get wrong, since include/exclude rules and skip-smudge env vars live outside normal Git commands. Epoch's content-addressed signed-event model can instead make the fetched set an explicit, auditable property of the checkout.
- The separate store and Batch API introduce a second failure domain (auth, transfer, quota) that is opaque relative to the familiar Git UI, so failures feel disconnected from the action that triggered them.
