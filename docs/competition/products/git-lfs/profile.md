---
product: Git LFS
slug: git-lfs
category: git_large_file_pointer_storage
primary_sources:
  - https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
  - https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-smudge.adoc
---

# Git LFS

Git LFS (Large File Storage) is a Git extension that replaces large files in a repository with small text pointer files while storing the real bytes in a separate object store. It is the de facto baseline for large-file version control and the direct incumbent Epoch must beat on efficiency and verifiability. It competes with Epoch anywhere teams keep binary or large artifacts in a Git-style history and need those artifacts fetched, checked out, and versioned without bloating the core repository.

Git LFS works through a clean/smudge filter driver wired up by `.gitattributes`. On `git add`, the clean filter writes the real file bytes into the local object store (`.git/lfs/objects`, named by content hash) and replaces the staged blob with a small pointer file containing `version https://git-lfs.github.com/spec/v1`, `oid sha256:<hex>`, and `size <bytes>`. On checkout, the smudge filter (or the long-running `filter.process` protocol) reads the pointer, finds the object locally or downloads it from the LFS server via the Batch API, and expands it back into the working tree. The object identity (OID) is the SHA-256 of the file content.

## Competitive Relevance

- Git LFS is the dominant, Git-native approach to large files, so most teams evaluating Epoch will already know its pointer-file mental model and its pain points.
- Objects live in a separate LFS store reached over HTTP, with the Batch API negotiating transfers (upload/download actions, hrefs, and per-object authentication).
- Partial fetch is configuration-driven: `GIT_LFS_SKIP_SMUDGE`, `lfs.fetchinclude`/`lfs.fetchexclude`, and `git lfs pull --include=` let a clone fetch only selected paths, and the full history of a large file is not pulled by default.
- Edit and patch are whole-object replacement: there is no delta between versions, so every version of a churny binary is stored as a full copy server-side, causing history bloat.
- Optional file locking (`git lfs lock`) gives teams an exclusive-edit workflow for unmergeable binaries, addressing a real collaboration gap that plain Git cannot.
- Strengths are simplicity and deep Git integration; weaknesses are no delta compression, pointer/merge friction, and history bloat on frequently changing binaries.

## Epoch Implications

- The pointer-file indirection is closely analogous to Epoch's storage-descriptor / external-pointer idea (ADR-0015 Option 11), but Epoch keeps the content hash bound to full content and stays verifiable, rather than trusting an opaque separate store.
- Git LFS's whole-object, no-delta storage is exactly the weakness Epoch's content-defined chunking (ADR-0015) is designed to beat: only changed chunks should move or be stored, not entire re-copied files.
- LFS include-path fetch (`--include=`, fetchinclude/exclude) maps directly to Epoch's targeted partial checkout direction (ADR-0016) — "edit without holding every file."
- LFS file locking is a precedent for Epoch's binary-edit exclusive locks (ADR-0016); Epoch can go further by binding lock acquisition and release to signed events in the history rather than a side-channel lock server.
- Epoch should treat "verifiable, signed, delta-efficient large-file handling" as the headline differentiator against the most familiar incumbent, and reuse LFS's `.gitattributes` opt-in ergonomics as a known-good adoption pattern.
