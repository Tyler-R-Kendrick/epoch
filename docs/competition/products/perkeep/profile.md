---
product: Perkeep (Camlistore)
slug: perkeep
category: content_addressed_storage
primary_sources:
  - https://perkeep.org/
  - https://perkeep.org/doc/
  - https://perkeep.org/doc/schema
  - https://perkeep.org/doc/terms
  - https://github.com/perkeep/perkeep
---

# Perkeep (Camlistore)

Perkeep (renamed from Camlistore in 2018), an open-source "personal storage system for life" created by Brad Fitzpatrick and others, keeps, indexes, and lets you share your own data. Everything is a content-addressed blob; large files are split into chunks referenced by a small "file" schema blob (a manifest); and mutable state lives in cryptographically signed claims over permanodes. That layering — immutable content blobs, a signed mutable overlay, and a rebuildable index — makes it the closest structural mirror to the shape Epoch has chosen.

## Competitive Relevance

- Everything is a content-addressed blob, referenced by a blobref: a hash string such as `sha224-...` or `sha256-...`, so identity is derived from content and is self-verifying.
- Storage is a blob server with pluggable backends (local disk, Amazon S3, Google Cloud Storage, and others); blob servers can sync and replicate blobs to each other.
- Large files are split into chunks using a rolling checksum; a small JSON "file"/"bytes" schema blob references the ordered content chunks (the parts) and describes how to reassemble the file — structurally the same as Epoch's chunk manifest.
- Schema blobs are JSON blobs describing files, directories, and other structures; they are themselves content-addressed like any other blob.
- Permanodes are stable blobs that represent a durable "thing"; their state evolves through claims — cryptographically (GPG) signed JSON mutation blobs. Perkeep thus layers a signed, mutable overlay (permanodes plus claims) on top of immutable content blobs.
- A search index (maintained over SQLite or other databases) is kept separately and is rebuildable from the blobs: the blobs are the source of truth, the index is a derived cache.
- Garbage collection and retention follow reachability from permanodes and roots; blobs are immutable and enumerable.

## Epoch Implications

- Perkeep is the closest structural analog to Epoch's chosen shape: content chunks plus a file-schema (manifest) blob map almost directly onto Epoch's chunk-manifest direction (ADR-0015 Option 2).
- Signed claims over permanodes on immutable blobs mirror Epoch's signed events over content-addressed blobs — the event overlay reached through the storage-descriptor seam (ADR-0015 Option 5).
- The rebuildable search index is the same pattern as Epoch's regenerable, unsigned caches that are excluded from `verify` (`checkout.json`, `views.json`, `compacts/`): the signed blobs are canonical, the index is a throwaway derivation.
- Blob-server sync plus pluggable backends map onto Epoch's pluggable transport and availability tiers (ADR-0003, and ADR-0015 Option 6 / the `external-pointer` descriptor), validating that durability can ride on commodity object stores.
- The difference is scope: Perkeep targets personal data hoarding, not multi-author review, branching, or policy. Epoch adds deterministic named views, intent policy, and a total `verify`.
- Perkeep validates the whole thesis — "immutable content blobs plus a signed mutable overlay plus a rebuildable index" is a proven, coherent architecture, not a speculative one.
