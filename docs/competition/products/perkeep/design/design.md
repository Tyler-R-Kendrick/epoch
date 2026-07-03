---
product: Perkeep (Camlistore)
design_sources:
  - https://perkeep.org/
  - https://perkeep.org/doc/
  - https://perkeep.org/doc/schema
  - https://perkeep.org/doc/terms
  - https://github.com/perkeep/perkeep
---

# Design

## Look And Feel

Perkeep is a personal server (a blob server daemon) plus command-line clients and a web UI for importing, browsing, and searching your data. The conceptual surface is a small, precise vocabulary documented on perkeep.org: blobs and blobrefs, schema blobs (JSON describing files and directories), permanodes, and claims. The web UI presents permanodes as durable objects you can tag, describe, and share, while the underlying storage stays an opaque content-addressed blob pile.

## Open Design Assets

- Perkeep is open source, so the blob, schema, and claim formats are fully specified in code and on perkeep.org/doc/schema and /doc/terms.
- The terminology page defines blob, blobref, schema blob, permanode, and claim precisely, which is the vocabulary this dossier reuses.
- The project documents its blob-server backends and sync model, so the pluggable-storage and replication design is public.

## Differentiators

- Everything is a content-addressed blob addressed by a blobref, so integrity and deduplication are structural rather than bolted on.
- Large files become content chunks plus a small "file"/"bytes" schema blob (a manifest) listing the ordered parts — a clean separation of bytes from the description of how to reassemble them.
- Mutable state is expressed only through GPG-signed claims against permanodes, so the mutable overlay is authenticated while the content blobs stay immutable.
- The search index is explicitly a derived cache rebuildable from the blobs, so the blobs remain the single source of truth.

## What Works

- The content-chunks-plus-file-schema-blob split is almost exactly Epoch's chunk-manifest (ADR-0015 Option 2): an ordered list of content-addressed parts under a small manifest blob that is itself content-addressed.
- Signed claims over permanodes on top of immutable blobs are a working demonstration of Epoch's signed-event overlay: authenticity lives in the signed mutation, availability and dedup in the content-addressed store beneath it.
- Treating the index as a rebuildable cache validates Epoch's stance that `checkout.json`, `views.json`, and `compacts/` are regenerable and excluded from `verify` — the signed blobs are canonical.
- Pluggable blob backends and blob-server sync show durability riding on commodity stores (disk, S3, GCS), a clean model for Epoch's pluggable transport and availability tiers.

## UX Breakdowns

- Perkeep is a single-user personal store; it has no multi-author review, branching, or merge semantics. Epoch must supply the collaboration and named-view model Perkeep omits.
- Claims evolve permanode state, but there is no policy or intent layer gating what a mutation may do; Epoch adds intent policy over signed events.
- Signing is GPG-centric and oriented to one owner's key; Epoch's multi-author signed events need a broader identity and trust story.
- The system is aimed at data hoarding and retrieval rather than deterministic checkout of a named state, so reproducing "exactly this tree" is not its focus the way Epoch's views and `verify` make it.
