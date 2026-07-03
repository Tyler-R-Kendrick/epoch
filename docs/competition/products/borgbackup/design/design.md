---
product: BorgBackup
design_sources:
  - https://www.borgbackup.org/
  - https://borgbackup.readthedocs.io/en/stable/internals.html
  - https://borgbackup.readthedocs.io/en/stable/internals/data-structures.html
  - https://github.com/borgbackup/borg
---

# Design

## Look And Feel

BorgBackup is a command-line tool; its "design" is the on-disk repository format and the CLI verbs (`init`, `create`, `list`, `extract`, `prune`, `compact`, `mount`). The conceptual surface is a small set of well-defined structures: a repository as an append-only log of **segments** holding content-defined chunks, a **manifest** object that lists archives, and each **archive** as a metadata stream referencing chunk ids. `borg mount` exposes an archive over FUSE so a backup can be browsed and partially restored without full extraction.

## Open Design Assets

- The borgbackup.org site and the readthedocs internals and data-structures pages document the repository/segment format, the chunker, chunk-id derivation, the manifest, and the encryption and compression modes.
- The project is open source (`github.com/borgbackup/borg`), so the format and pipeline are fully specified in code (Python with C/Cython hot paths); Borg descends from Attic.
- The chunker (`--chunker-params`), compression algorithms, and encryption/authentication modes are all documented and configurable rather than hidden.

## Differentiators

- Content-defined chunking with a **buzhash rolling hash**, tunable via `--chunker-params` (default `19,23,21,4095`: min 512 KiB, max 8 MiB, ~2 MiB average, 4095-byte window); Borg 2 adds a faster `buzhash64`.
- Chunk identity is a **keyed HMAC-SHA256 hash of the plaintext chunk** (plain hash when unencrypted), so deduplication survives compression and encryption.
- A strict **chunk → compress → encrypt/authenticate** pipeline applied per chunk, with a local chunk cache to skip already-stored ids.
- An **append-only segmented log** with a repository lock (single active writer), append-only mode, and `prune`/`compact` for retention and space reclamation.

## What Works

- The chunk → compress → encrypt ordering directly answers ADR-0015's "weaker on compressed or encrypted inputs" caveat: Epoch can adopt a keyed-hash chunk id computed over plaintext to keep global dedup intact even when chunks are compressed and encrypted.
- The **local chunk cache** is a concrete model for Epoch's have/want negotiation and skip-existing behavior on the chunk-range transport (ADR-0015 Option 6).
- **Append-only mode plus the repository lock** are working prior art for ADR-0016's single-writer, exclusive-edit safety for unmergeable binaries.
- `prune`/`compact` demonstrate a lifecycle for reclaiming space from unreferenced chunks — the chunk-level garbage collection ADR-0015 names as new machinery.

## UX Breakdowns

- Borg has no history, branching, or authorship model; it is single-repository backup, so Epoch must supply the signed-event history and multi-author semantics borg deliberately omits.
- The manifest is internal repository state, not a signed, publicly verifiable object; Epoch's advantage is signing the manifest so the whole tree is authenticated end to end, not merely internally consistent under a shared key.
- The repository lock is repo/server-side session state; Epoch instead expresses "who holds the edit token" as auditable signed lifecycle events, which must then handle abandonment and expiry that a live lock handles implicitly.
- The tooling is backup-operator oriented (CLI, FUSE, retention policies, passphrase/key management); Epoch needs friendlier materialization and key UX to bring this power to everyday developer checkouts.
