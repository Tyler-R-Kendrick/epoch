---
product: BitTorrent
design_sources:
  - https://www.bittorrent.org/beps/bep_0003.html
  - https://www.bittorrent.org/beps/bep_0052.html
  - https://blog.libtorrent.org/2020/09/bittorrent-v2/
---

# Design

## Look And Feel

BitTorrent has no single UI; its "design" is the protocol surface and the file artifacts (`.torrent` files and magnet links) that clients render. The developer-facing experience is the info-dict structure: an ordered list of piece hashes plus file layout for v1, and a file tree of per-file Merkle roots for v2. End-user clients wrap this in familiar download managers showing pieces, peers, seeders, and progress bars.

## Open Design Assets

- The BEP series (BEP3, BEP9, BEP19, BEP52) is the open, versioned specification set and is the primary design reference.
- The libtorrent blog post on BitTorrent v2 documents the v2 Merkle-tree layout, piece-layers dict, and hybrid-torrent rationale.
- Reference implementations (libtorrent and others) expose the bencoding, info-dict, and DHT designs as de facto assets, but there is no shared visual design system.

## Differentiators

- Content addressing by info-hash: the swarm identity is derived from the content description itself, so the identifier is self-describing and tamper-evident at the metadata level.
- Piece-granular verification: corruption is caught before a bad piece propagates, which is the core trust mechanism of the swarm.
- v2's per-file Merkle trees add 16 KiB block-level tamper evidence, incremental proofs, and cross-torrent file dedup via identical roots.
- Trackerless operation via the DHT and magnet links removes the central metadata origin, leaving only content-addressed discovery.

## What Works

- Hash-verified pieces make the distribution path trustless for integrity: a peer never has to trust the sender, only the hash. This is exactly the property Epoch's content-addressed signed-event model relies on, extended with signatures for authenticity.
- The v2 Merkle design shows how to verify arbitrary chunks against a compact root, the same pattern Epoch's chunk manifests need for streaming verification.
- Web seeds demonstrate a clean fallback: a content-addressed swarm that can degrade to an HTTP origin, informing Epoch's availability-tier thinking (swarm plus backup origin).
- Magnet links prove that a bare content hash is enough to bootstrap discovery and metadata fetch, reinforcing that Epoch chunks/manifests can be addressed purely by hash.

## UX Breakdowns

- Availability is emergent and opaque: a user with a valid info-hash can still get nothing if seeders vanish. Epoch must not inherit this; availability needs to be a first-class, visible guarantee via pinning and backup origins.
- Integrity verification does not imply authenticity or anti-poisoning: fake peers, decoy torrents, and DHT sybil/eclipse attacks are not stopped by piece hashing. Epoch's signed events close this gap, and the design lesson is that hashing alone is insufficient.
- SHA-1 in v1 is cryptographically weak, a reminder that Epoch should commit to strong hashes (SHA-256 and above) and version its manifest format for future migration, as BitTorrent did with hybrid torrents.
- The split between v1 and v2 shows migration cost: supporting both doubles metadata. Epoch should design manifest versioning up front so a future chunking/hash change does not fracture the ecosystem.
