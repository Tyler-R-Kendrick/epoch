---
product: BorgBackup
marketing_sources:
  - https://www.borgbackup.org/
  - https://borgbackup.readthedocs.io/en/stable/internals.html
  - https://borgbackup.readthedocs.io/en/stable/internals/data-structures.html
  - https://github.com/borgbackup/borg
---

# Marketing

BorgBackup is an open-source project, so its "marketing" is an adoption and positioning narrative carried by borgbackup.org, the readthedocs documentation, and the GitHub project, rather than a sales motion.

## Target Customers

- System administrators and self-hosters who want space-efficient, encrypted backups of servers and workstations.
- Teams backing up snapshots with heavy cross-snapshot overlap, where global deduplication cuts storage dramatically.
- Privacy-conscious users who need client-side encryption while still deduplicating.
- Operators who want append-only backups that resist tampering or ransomware deleting history.

## Positioning

BorgBackup is positioned as a **deduplicating, compressing, and encrypting** backup program that is "space efficient and secure." Content-defined chunking plus global deduplication and compression keep repositories small; authenticated encryption protects confidentiality and integrity; and append-only mode protects existing backups from a compromised client. The message is efficient, verifiable, encrypted backups over SSH or to local disk, without a hosted service in the loop.

## Customer Model

- Open-source and self-hosted; the value is the tool and repository format, not a hosted product (though third parties such as BorgBase offer hosting for borg repositories).
- Borg is a community-maintained descendant of Attic, distributed through OS packages and standalone binaries.
- A repository lives on local disk or on a remote host reachable over SSH; a single borg client writes to it under a lock.
- Borg 2 modernizes the crypto suite (AES-OCB, chacha20-poly1305) and adds a faster `buzhash64` chunker (version facts hedged as secondary).

## Captures

- Backup workflows with heavy cross-snapshot overlap, where dedup and compression pay for themselves.
- Encrypted off-site backup over SSH to commodity remote storage.
- Append-only repositories used defensively for ransomware and tamper resistance.
- Users who want to mount and browse a backup over FUSE rather than fully extract it to restore a few files.

## Misses

- Version control: no branching, history, or authorship, so it is a backup tool, not a VCS.
- Multi-writer collaboration: a single-writer repository lock serializes writers by design.
- Publicly verifiable authenticity: integrity rests on a shared key and internal structure, not signed, publicly verifiable manifests.
- Collaboration and review semantics over evolving multi-author content.
