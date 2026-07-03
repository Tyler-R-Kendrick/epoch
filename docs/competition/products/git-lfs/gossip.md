---
product: Git LFS
gossip_sources:
  - https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-smudge.adoc
---

# Gossip

## What People Say

- Git LFS is widely treated as the default answer for large files in Git, praised mostly for being available everywhere and requiring little new knowledge.
- Practitioners commonly report that it works fine for occasional large assets but becomes painful once binaries change often, because every version is stored in full. (Widely repeated community sentiment; not a vendor claim.)
- The pointer-file model is generally appreciated as transparent and debuggable, since users can open a pointer and see the oid and size.
- Locking is described as a useful escape hatch for teams with unmergeable binaries, though a bolt-on rather than a native collaboration model.

## Bug And Friction Themes

- Literal pointer text ending up in the working tree when the filter is not installed, a `.gitattributes` entry is missing, or a checkout misfires. (Common friction report.)
- History and repository bloat from no delta compression on churny large files, leading to slow clones, pushes, and quota exhaustion.
- Partial-fetch controls (`GIT_LFS_SKIP_SMUDGE`, fetchinclude/exclude, `git lfs pull --include=`) being powerful but easy to misconfigure because they live outside normal Git commands.
- The separate LFS store and Batch API adding an opaque second failure domain for auth, transfer, and quota errors.

## Product Risk For Epoch

- Git LFS's ubiquity means Epoch must clear a high familiarity bar; "yet another large-file tool" is a real perception risk unless the efficiency and verifiability gains are obvious.
- Because LFS is "good enough" for light large-file use, Epoch's wedge is the churny-binary and large-scale case where no-delta storage clearly hurts, backed by content-defined chunking (ADR-0015).
- Epoch should make targeted checkout and binary-edit locks feel native and signed (ADR-0016), directly addressing LFS's manual partial-fetch and bolt-on locking, and must ensure its own filter/hydration path never leaves users with stranded placeholder files.
