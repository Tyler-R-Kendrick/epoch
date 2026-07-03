---
product: Hypercore (Dat)
design_sources:
  - https://www.datprotocol.com/deps/0002-hypercore/
  - https://github.com/holepunchto/hypercore
  - https://hypercore-protocol.github.io/new-website/protocol/
---

# Design

## Look And Feel

Hypercore is a protocol and a set of JavaScript libraries rather than an end-user application. The design surface developers work with is the append-only log API, the 32-byte public-key feed identifier, and higher layers such as Hyperdrive (a filesystem over two cores) and hyperswarm (peer discovery). Applications like the Beaker browser historically gave Dat a user-facing form, but the primitive is the log.

## Open Design Assets

- The Dat DEP (Dat Enhancement Proposal) series, especially DEP-0002 for Hypercore, is the open specification.
- The Holepunch/Hypercore GitHub repositories expose the log, Merkle-tree, replication, and hyperswarm designs as reusable modules.
- The Hypercore Protocol website documents the append-only log, signed roots, and sparse replication model.

## Differentiators

- A single Ed25519 key both names the feed and authorizes appends, unifying identity and integrity in one primitive.
- The Merkle root is signed on every append, so authenticity and tamper-evidence are built in, not bolted on.
- Sparse replication lets peers fetch and verify arbitrary block ranges without downloading the whole log.
- Hyperdrive composes two cores (metadata plus content) into a versioned filesystem, showing how higher structures build on the log.

## What Works

- Signing a Merkle root that transitively authenticates all content is exactly Epoch's model; Hypercore proves it works as a live p2p system and is strong validation of Epoch's content-addressed signed-event direction.
- Sparse, range-based replication is a direct template for Epoch's targeted/partial checkout (ADR-0016): fetch only needed chunks and verify each against the signed structure as it streams.
- The single-key feed identity is an elegant model for tying authorship and integrity together, informing how Epoch binds signed events to actor keys.
- The append-only log gives a clean, verifiable history primitive that pairs naturally with Epoch's event-driven design.

## UX Breakdowns

- Single-writer-per-core is the central limitation: real collaboration needs multiple cores or Autobase-style composition, and multi-writer semantics become the hard, awkward part. Epoch's multi-author signed events plus CRDT entities are aimed squarely at this gap, and the lesson is to design multi-writer in from the start rather than compose around a single-writer core.
- Availability still depends on a peer hosting the requested ranges, so the same "valid key, no data" risk applies; Epoch needs explicit availability tiers.
- The primitive is low-level; usable collaboration requires substantial higher-layer construction, which fragmented the Dat ecosystem's UX. Epoch should own more of that stack to keep the experience coherent.
- Key management is load-bearing: losing the private key means the log can never be extended, a reminder that Epoch's key/identity UX must be robust and recoverable.
