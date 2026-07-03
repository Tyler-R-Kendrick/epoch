---
product: BitTorrent
marketing_sources:
  - https://www.bittorrent.org/beps/bep_0003.html
  - https://www.bittorrent.org/beps/bep_0052.html
  - https://blog.libtorrent.org/2020/09/bittorrent-v2/
---

# Marketing

BitTorrent is a protocol rather than a commercial product, so its "marketing" is an adoption and positioning narrative carried by the open BEP specifications and reference implementations.

## Target Customers

- Distributors of large files who want to offload bandwidth from a single origin onto a swarm of downloaders.
- Communities distributing open datasets, OS images, and software releases where many parties want the same bytes at once.
- Client and library developers who implement the protocol into download managers, sync tools, and content-delivery systems.
- Anyone needing trackerless, decentralized distribution addressable by a single content hash (magnet link).

## Positioning

BitTorrent positions itself as the efficient, decentralized alternative to origin-served downloads: the more popular a file, the more capacity the swarm has to serve it. The v2 narrative (BEP52) repositions the protocol around modern cryptographic hygiene and per-file Merkle verification, emphasizing tamper-evidence, cross-torrent file deduplication, and future-proof SHA-256 hashing over the aging SHA-1 v1 design.

## Customer Model

- Adoption is driven by open specifications and interoperable clients rather than a vendor sales motion.
- The DHT, PEX, and magnet links reduce reliance on any central tracker, so the network sustains itself as long as peers participate.
- Web seeds provide an on-ramp for content owners who want swarm efficiency with an HTTP origin as backstop.
- Value accrues to the ecosystem (clients, indexers, seedboxes) rather than to a single protocol owner.

## Captures

- High-demand content where swarm scaling turns popularity into capacity.
- Integrity-sensitive distribution where per-piece (v1) or per-block (v2) hashing catches corruption early.
- Decentralized use cases that want no single metadata origin, served by DHT and magnet links.
- File-level deduplication across torrents once v2 identical-file roots are in play.

## Misses

- Guaranteed availability: unpopular content with no seeders simply disappears, which the protocol does not solve.
- Authenticity and anti-poisoning: hashing proves integrity but not provenance, leaving decoys and sybil attacks unaddressed.
- Access control and privacy: swarms are public by default, unsuitable for confidential or redaction-sensitive content.
- Mutable history and collaboration: BitTorrent distributes fixed content, not evolving signed histories, which is where an Epoch-style DVCS is needed.
