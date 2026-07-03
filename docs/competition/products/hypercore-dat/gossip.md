---
product: Hypercore (Dat)
gossip_sources:
  - https://github.com/holepunchto/hypercore
  - https://www.datprotocol.com/deps/0002-hypercore/
  - https://hypercore-protocol.github.io/new-website/protocol/
---

# Gossip

As an open protocol, Hypercore/Dat's "gossip" is developer and community sentiment expressed through the DEP process, GitHub, and the local-first/p2p community.

## What People Say

- Developers admire Hypercore as an elegant primitive: a signed append-only log with a single-key identity and verifiable sparse replication is widely cited as beautiful engineering.
- The signed-root design is respected for making authenticity and integrity intrinsic rather than optional.
- Sparse replication draws praise as a genuinely useful property for large logs and feeds.
- Sentiment on Dat's trajectory is mixed nostalgia: strong ideas, several rebrands (Dat, Hypercore Protocol, Holepunch/Pears), and uncertainty about ecosystem continuity.

## Bug And Friction Themes

- The single-writer-per-core model is the most common frustration; multi-writer collaboration via Autobase or multiple cores is powerful but complex and easy to get wrong.
- Availability depends on peers hosting the ranges, so feeds can go dark, the same p2p persistence problem seen elsewhere.
- The low-level nature means real apps require heavy higher-layer plumbing, raising the barrier to entry.
- Ecosystem churn and rebrands have made documentation and stable references harder to track over time.

## Product Risk For Epoch

- Hypercore proves Epoch's signed-log core is sound, but its single-writer limitation is the exact risk Epoch is trying to avoid; if Epoch's multi-author signed events plus CRDT entities are not clearly better than composing single-writer cores, the differentiation is weak. Epoch should validate its multi-writer story against Autobase's rough edges.
- The availability gap warns Epoch that a signed log alone is not enough; explicit availability/pinning tiers are required.
- Ecosystem churn is a cautionary tale about coherence: Epoch should own enough of the stack and documentation to avoid the fragmentation that diffused Dat's momentum.
- Key-loss meaning permanent inability to extend a log warns that Epoch's key and identity UX must be robust and recoverable.
