---
product: Hypercore (Dat)
slug: hypercore-dat
category: signed_append_only_p2p_log
primary_sources:
  - https://www.datprotocol.com/deps/0002-hypercore/
  - https://github.com/holepunchto/hypercore
  - https://hypercore-protocol.github.io/new-website/protocol/
---

# Hypercore (Dat)

Hypercore (the core of the Dat protocol, now maintained under Holepunch) is a signed, append-only log of binary blocks with a Merkle-tree integrity structure and Ed25519-signed roots. It is arguably the closest prior art to Epoch: a signed, append-only, content-verified log identified by a public key, with sparse range-based peer replication.

## Competitive Relevance

- A hypercore is a signed append-only log of binary blocks (each up to roughly 8 MB).
- Integrity comes from a flat in-order Merkle tree of BLAKE2b-256 block hashes; internal nodes hash child pairs up to a root.
- Each feed is identified by a 32-byte Ed25519 public key; the Merkle root is signed on every append with the feed's private key, so only the key owner can extend the log.
- Any peer can verify blocks against the signed root without central coordination, giving authenticated, tamper-evident content.
- Distribution uses peer discovery via DHT/DNS/mDNS (hyperswarm) and sparse replication: a peer downloads only the requested block ranges and verifies each against the tree.
- Hyperdrive layers a filesystem over two hypercores (metadata and content).
- The model is single-writer per core by design; multi-writer collaboration requires composing multiple cores or higher-level constructs such as Autobase.
- Availability still depends on some peer hosting the requested ranges.

## Epoch Implications

- Hypercore is the closest existing analogue to Epoch's architecture: a signed, append-only, content-verified log with an Ed25519 key and a signed Merkle root that transitively authenticates all content. It is strong validation of Epoch's signed-event core.
- Sparse range replication (download and verify only requested block ranges) maps almost directly onto Epoch's ADR-0016 targeted/partial sync of just the needed chunks, and shows the pattern is proven at scale.
- The signed-root design reinforces an Epoch principle: sign a single root that transitively authenticates all downstream content, then replicate ranges rather than whole logs, verifying each range as it arrives.
- The single-writer-per-core constraint is the key contrast: Epoch's multi-author signed events and CRDT entities aim past Hypercore's main limitation, so Epoch should study how Autobase composes multiple single-writer cores and where that composition gets awkward.
- Availability still depending on a hosting peer echoes the same lesson as BitTorrent and IPFS: Epoch needs explicit availability/pinning tiers on top of the signed-log substrate.
