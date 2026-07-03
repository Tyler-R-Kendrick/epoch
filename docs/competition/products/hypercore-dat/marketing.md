---
product: Hypercore (Dat)
marketing_sources:
  - https://www.datprotocol.com/deps/0002-hypercore/
  - https://github.com/holepunchto/hypercore
  - https://hypercore-protocol.github.io/new-website/protocol/
---

# Marketing

Hypercore/Dat is an open protocol and library ecosystem, so its "marketing" is an adoption and positioning narrative carried by the DEP specifications, the Holepunch project, and applications built on top.

## Target Customers

- Builders of peer-to-peer and local-first applications who need a verifiable, replicable data primitive.
- Developers of decentralized filesystems, feeds, and datasets that want authenticated append-only history.
- Projects seeking an alternative to server-centric sync where a single key both names and authorizes a data feed.
- Researchers and civic-tech/data-sharing communities that originally rallied around Dat for reproducible dataset distribution.

## Positioning

Hypercore positions itself as a fast, secure, signed append-only log for building peer-to-peer applications, with sparse replication so peers can subscribe to just the ranges they need. Under Holepunch, the positioning has shifted toward a full peer-to-peer application stack (Pears/Keet) built on the same primitives, emphasizing serverless, end-to-end, key-addressed data.

## Customer Model

- Adoption is open-source and developer-led, driven by the quality of the primitives rather than a sales motion.
- The single Ed25519 key as feed identity makes distribution and access permissionless: anyone with the key can replicate and verify.
- Higher layers (Hyperdrive, hyperswarm, Autobase) extend the addressable use cases while keeping the log at the core.
- Value accrues to an ecosystem of libraries and apps rather than a single hosted product.

## Captures

- Local-first and p2p app developers who want authenticated, replicable logs.
- Use cases needing sparse subscription to large logs rather than full downloads.
- Projects that value a unified identity-plus-integrity primitive via a single key.
- Communities distributing versioned datasets and feeds.

## Misses

- Native multi-writer collaboration: single-writer cores push complexity into higher layers, limiting mainstream collaborative use.
- Guaranteed availability: replication still depends on a peer hosting the needed ranges.
- Turnkey UX: the low-level primitive requires substantial construction before end users see value.
- Rich governance, review, and policy semantics over evolving multi-author content, the space an Epoch-style DVCS targets.
