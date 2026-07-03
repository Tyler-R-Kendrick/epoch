---
product: BorgBackup
gossip_sources:
  - https://www.borgbackup.org/
  - https://borgbackup.readthedocs.io/en/stable/internals.html
  - https://borgbackup.readthedocs.io/en/stable/internals/data-structures.html
  - https://github.com/borgbackup/borg
---

# Gossip

As open-source tooling, BorgBackup "gossip" is developer and sysadmin sentiment expressed through the GitHub project, the documentation, and practitioner experience running borg in production.

## What People Say

- Borg is widely praised for excellent deduplication and compression ratios combined with client-side authenticated encryption, all in one tool.
- Append-only mode is valued as a practical defense against a compromised client deleting or rewriting backup history.
- As a mature descendant of Attic, borg has a reputation for reliability and a well-documented on-disk format.
- `borg mount` over FUSE is called out as a convenient way to browse archives and restore individual files.

## Bug And Friction Themes

- The single-writer repository lock is a recurring friction point: stale locks after a crashed or interrupted run must be cleared, and concurrent backups to one repository serialize (secondary detail from practitioner reports, hedged).
- Chunker parameters trade dedup ratio against per-chunk overhead; the defaults (`19,23,21,4095`) are not always ideal for a given workload and sometimes need tuning.
- `prune` versus `compact` is a common point of confusion: pruning archives does not itself reclaim disk space until `compact` rewrites the segments.
- Key and passphrase management is high-stakes — losing the key or passphrase to an encrypted repository means the backups are unrecoverable.
- Throughput has historically been bounded by Python hot paths, mitigated by C/Cython acceleration and, in Borg 2, the faster `buzhash64` chunker (version facts hedged).

## Product Risk For Epoch

- Borg validates content-defined chunking and the chunk → compress → encrypt pipeline so strongly that Epoch's differentiation must be crisp: signed, publicly verifiable manifests, multi-author history, and branching are what borg deliberately lacks.
- The keyed chunk id that preserves dedup under encryption is a pattern Epoch should adopt directly; the risk is shipping chunking that loses dedup on compressed or encrypted inputs when borg shows it need not.
- Borg's single-writer lock and its stale-lock friction warn Epoch that expressing exclusive locks as signed events (rather than live server state) must handle abandonment and expiry, not just acquisition.
- The `prune`/`compact` split is a reminder that chunk-level garbage collection and space reclamation are real operational surface — exactly what ADR-0015 flags as new machinery to build and tune.
