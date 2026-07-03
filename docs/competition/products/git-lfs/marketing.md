---
product: Git LFS
marketing_sources:
  - https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-smudge.adoc
---

# Marketing

## Target Customers

- Git users who need to version large binaries such as media, datasets, game assets, and design files without bloating the core repository.
- Teams already on GitHub, GitLab, or Bitbucket, all of which ship LFS support and hosted LFS stores.
- Developers who want large-file handling with zero new tooling beyond a Git extension and a `.gitattributes` entry.
- Groups with unmergeable binaries who need optional exclusive file locking on top of Git.

## Positioning

Git LFS is positioned as the standard, open-source way to put large files under Git: an extension that "replaces large files with text pointers" while storing the content on a remote server. Its marketing leans on ubiquity and Git-nativeness rather than raw efficiency; it is the safe default that every major Git host supports.

## Customer Model

- Git LFS the client is open source and free; capture happens at the hosting layer.
- Hosts (GitHub, GitLab, Bitbucket, self-hosted LFS servers) monetize through storage and bandwidth quotas on the separate LFS object store.
- The Batch API is a standard integration point, so many vendors implement compatible LFS backends and compete on price and throughput.
- Adoption is driven bottom-up by developers hitting Git's large-file limits, then formalized by teams and CI.

## Captures

- Software teams with occasional large assets who want the path of least resistance.
- Organizations standardized on a Git host that includes LFS support out of the box.
- Users who value a transparent, inspectable pointer format and standard tooling.
- Teams needing basic exclusive locking for binaries that cannot be merged.

## Misses

- Teams with frequently changing large binaries, where whole-object, no-delta storage causes painful history bloat and slow transfers.
- Users who need chunk-level or delta-efficient storage rather than full re-copies per version.
- Workflows needing verifiable, signed provenance over large artifacts rather than trust in an opaque separate store.
- Very-large-scale repositories (millions of files or terabytes) where pointer-and-fetch ergonomics and full-object storage strain, and where virtual or chunk-native systems fit better.
