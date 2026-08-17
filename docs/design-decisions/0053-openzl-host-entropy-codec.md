# ADR-0053: OpenZL As Host Entropy Codec

Status: Accepted

## Context

[ADR-0038](0038-semantic-diff-merge-and-compression.md) defines semantic
compression *planning* (syntax chunks, subtree dedup, dictionaries, structural
deltas) but deliberately keeps `@epoch/semantic` free of byte-level entropy
coding. [ADR-0018](0018-blob-subsystem-reference-architecture.md) requires
plaintext SHA-256 identity: compress after chunking, never redefine content
hashes. Sync v2 ([ADR-0032](0032-residency-native-sync-and-workspace-providers.md))
advertised only `identity`.

[OpenZL](https://openzl.org/) is Meta's format-aware compression framework: a
data shape (entity / SDDL profile) drives specialized transforms, then a single
universal decompressor recovers the plaintext. That matches Epoch's
entity-aware storage story.

## Decision

1. Ship **`@epoch/openzl`** as the **host** entropy codec. It is **not** a
   dependency of `@epoch/semantic`.
2. Every compressed object records `{ codecId: "openzl", profile, entityType,
   dictionaryOid?, plaintextSha256 }` in an `epoch.openzl-frame/v1` envelope.
3. Content identity stays SHA-256 of **plaintext**. Verification decompresses
   then re-hashes.
4. Entity profiles map MIME-ish `entity_type` values to transforms (JSON
   columns, text/markdown passthrough prep, semantic-patch JSON, opaque binary).
5. Sync v2 advertises and negotiates `openzl` alongside `identity`. Peers that
   lack OpenZL fall back to `identity`.
6. The host codec may use OpenZL WASM/native backends when available; the
   envelope and profile contract stay stable so frames remain decompressible.

## Consequences

- Blob/artifact transfer and semantic changediffs shrink without weakening
  trust.
- CI and browsers that cannot load native OpenZL still get a deterministic
  host backend that honours the same frame contract.
- Packfiles (ADR-0018 L2) remain a later layer; OpenZL frames are the first
  entropy objects those packs would contain.

## Rejected alternatives

- Putting OpenZL inside `@epoch/semantic` — breaks the browser-safe boundary.
- Compressing before hashing — breaks content addressing.
- Advertising only gzip — forgoes entity-aware ratios OpenZL targets.
