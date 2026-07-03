---
product: IPFS
slug: ipfs
category: content_addressed_p2p_storage
primary_sources:
  - https://docs.ipfs.tech/concepts/content-addressing/
  - https://docs.ipfs.tech/concepts/lifecycle/
  - https://docs.ipfs.tech/how-to/troubleshooting/
  - https://ipfs.github.io/pinning-services-api-spec/
---

# IPFS

IPFS (the InterPlanetary File System) is a content-addressed peer-to-peer storage and distribution network. Content is chunked into a Merkle DAG and addressed by cryptographic hash, so any node can request and self-verify data by its identifier. It is directly relevant to Epoch as both a validation of content addressing and a widely documented cautionary tale about the gap between addressing and availability.

## Competitive Relevance

- Content is chunked (default fixed ~256 KiB, with optional Rabin content-defined chunking) into a Merkle DAG (unixfs/DAG-PB or DAG-CBOR); each node is addressed by a CID (multicodec + multihash = hash function + length + digest).
- The same content with the same settings yields the same CID, so addressing is self-verifying and deduplicating by construction.
- Distribution uses Bitswap (a block-exchange protocol with want-lists, conceptually BitTorrent-like) plus a Kademlia DHT that maps a CID to provider records (which nodes claim to have it); HTTP gateways bridge to the web.
- Availability is a well-documented weakness: content persists only while some node pins or hosts it, and unpinned content is garbage-collected. There is no built-in hosting incentive (unlike Filecoin).
- Provider records expire (roughly a 48-hour reprovide interval, secondary detail), so discovery fails if reprovide lags behind expiry.
- Reachability matters: if only the origin has a block and it sits behind symmetric NAT, even a paid pinning service may be unable to fetch it. The community summary is blunt: "content addressing is not content availability."
- A CID guarantees integrity (you cannot poison a given CID) but the DHT itself is subject to sybil and eclipse attacks on discovery.

## Epoch Implications

- IPFS's CID and self-verifying content addressing validate the core of Epoch's content-addressed signed-event model: an identifier derived from content is tamper-evident by construction.
- IPFS is the cautionary tale Epoch already flags (ADR-0001): availability must be a first-class, explicit concern, not an emergent property. Epoch needs pinning/seed/backup-origin tiers and active provider-record refresh, not just correct hashing.
- "Addressing is not availability" is the central lesson for Epoch's availability tiers and for its redaction story: knowing a chunk's hash says nothing about whether the chunk can still be fetched.
- The Merkle DAG plus optional content-defined chunking maps closely onto Epoch's ADR-0015 chunk-manifest direction, but Epoch should pair it with signatures (authenticity) and an availability guarantee that IPFS leaves to chance.
- The DHT sybil/eclipse exposure argues that Epoch discovery should not be the only trust anchor; signed manifests must authenticate content independent of how a peer was found.
