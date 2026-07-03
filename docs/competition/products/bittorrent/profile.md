---
product: BitTorrent
slug: bittorrent
category: p2p_swarm_distribution
primary_sources:
  - https://www.bittorrent.org/beps/bep_0003.html
  - https://www.bittorrent.org/beps/bep_0052.html
  - https://blog.libtorrent.org/2020/09/bittorrent-v2/
---

# BitTorrent

BitTorrent is the canonical peer-to-peer swarm distribution protocol. Content is described by a torrent whose hashes let any downloader verify pieces before sharing them onward, and peers exchange those pieces directly rather than from a central origin. It is relevant to Epoch as prior art for content-addressed, hash-verified distribution and, in its v2 form, for signed-manifest-style Merkle verification of chunks.

## Competitive Relevance

- In v1 (BEP3), files are concatenated and split into fixed-size pieces (256 KiB to 4 MiB); the `.torrent` info-dict holds the ordered list of SHA-1 piece hashes plus the file layout.
- The info-hash (SHA-1 of the bencoded info-dict) is the swarm identifier; every downloaded piece is hashed against the info-dict SHA-1 before being shared, rejecting corruption and poisoning at piece granularity.
- Peer discovery is layered: trackers (announce/scrape), a Kademlia DHT (key = info-hash -> peers, enabling trackerless operation), Peer Exchange (PEX), and magnet links that encode the info-hash and fetch metadata from peers via BEP9.
- Swarm economics use rarest-first piece selection and tit-for-tat choking to keep pieces circulating.
- Availability is emergent, not guaranteed: a torrent with zero seeders and no peer holding a rare piece is unrecoverable. Web seeds (BEP19) let an HTTP origin backstop the swarm.
- SHA-1 piece verification stops content corruption but not index/swarm poisoning (fake peers, decoy torrents, DHT sybil/eclipse attacks); SHA-1 is now cryptographically weak.
- v2 (BEP52) replaces this with a per-file Merkle tree (branch factor 2, leaves = 16 KiB blocks, SHA-256). Files live in a file tree; only each file's Merkle root ("pieces root") goes in the info-dict, while a separate `piece layers` dict carries the tree layer whose hashes each cover one piece length, so pieces verify without the whole tree.
- Any 16 KiB block is verifiable up to its per-file root, giving tamper-evident, incremental Merkle proofs; identical files produce identical Merkle roots, enabling cross-torrent file-level deduplication. Torrents are marked meta version 2, and hybrid torrents carry both v1 and v2 metadata for compatibility.

## Epoch Implications

- BEP52's per-file SHA-256 Merkle tree is a close structural analogue to an Epoch signed chunk manifest: a root that transitively authenticates every leaf. Epoch's ADR-0015 direction (signed Merkle manifests over content-defined chunks) can borrow the "root in the manifest, layer hashes carried alongside for piece-level verification" split.
- Identical-file-identical-root deduplication mirrors Epoch's content-addressed model directly and validates chunk-level dedup as a distribution win, not just a storage win.
- Incremental Merkle-proof verification maps onto Epoch's entity-aware streaming and partial-checkout goals (ADR-0016): verify each chunk as it arrives rather than after a whole-object download, and never trust a partially hashed object.
- Availability-depends-on-seeders and swarm poisoning are the cautionary half: Epoch must treat availability as explicit (pinning/seed/backup-origin tiers) rather than emergent, and must never accept a chunk that has not verified to a signed root.
- Content-addressed pieces are a natural swarm unit for Epoch chunks: the same chunk manifest that provides integrity can double as the addressing scheme for a swarm or CDN-tiered transport.
