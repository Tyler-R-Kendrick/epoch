---
product: IPFS
design_sources:
  - https://docs.ipfs.tech/concepts/content-addressing/
  - https://docs.ipfs.tech/concepts/lifecycle/
  - https://docs.ipfs.tech/how-to/troubleshooting/
  - https://ipfs.github.io/pinning-services-api-spec/
---

# Design

## Look And Feel

IPFS presents primarily as protocol and tooling: a CLI and daemon (Kubo), HTTP gateways that render content by CID in a browser, a pinning-service API, and desktop/companion apps. The conceptual surface is the CID string and the Merkle DAG, so the "design" users encounter is the addressing scheme and the lifecycle of a block from add, to provide, to pin, to garbage-collect.

## Open Design Assets

- The IPFS docs provide clear conceptual diagrams for content addressing, CIDs, the Merkle DAG, and the content lifecycle.
- The Pinning Services API specification is an open, standardized interface for third-party persistence.
- Kubo and the broader implementation set expose the Bitswap, DHT, and unixfs designs; the multiformats project (CID, multihash, multicodec) is an open, reusable addressing standard.

## Differentiators

- Self-verifying, self-describing addresses: a CID encodes the hash function and codec, so it is future-proof and independently verifiable.
- Deduplication by construction: identical content yields identical CIDs and shared DAG nodes, with no separate dedup pass.
- A clean separation between the content layer (CIDs, DAG) and the discovery layer (DHT provider records, Bitswap).
- Optional content-defined (Rabin) chunking for better dedup across similar files, alongside the fixed-size default.

## What Works

- Content addressing gives exactly the integrity property Epoch's model depends on: a chunk fetched by hash cannot be silently altered. This validates Epoch's content-addressed signed-event direction.
- The Merkle DAG with optional content-defined chunking is a strong template for Epoch's ADR-0015 chunk manifests, showing how to compose large objects from independently addressed, dedup-friendly nodes.
- The Pinning Services API is a good model for how Epoch could standardize an availability/pinning tier so persistence is an explicit, pluggable service rather than an implicit hope.
- Gateways demonstrate a practical fallback tier: content-addressed data reachable over plain HTTP, informing Epoch's pluggable-transport thinking.

## UX Breakdowns

- The signature failure is availability: users repeatedly discover that a valid CID resolves to nothing because content was unpinned and garbage-collected. Epoch must make availability visible and guaranteed, not silent and best-effort.
- Provider-record expiry (~48h reprovide, secondary detail) means discovery can lapse even when data still exists, a reminder that Epoch's availability tier must actively refresh, not just register once.
- NAT and reachability failures mean "someone has it" is not the same as "you can get it"; Epoch's availability guarantees must account for reachability, not just possession.
- The absence of a built-in hosting incentive pushes persistence onto external pinning services, fragmenting the reliability story. Epoch should decide deliberately where its persistence guarantee lives rather than leaving it emergent.
