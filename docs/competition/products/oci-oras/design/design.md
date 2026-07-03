---
product: OCI Registry / ORAS
design_sources:
  - https://github.com/opencontainers/distribution-spec
  - https://github.com/opencontainers/image-spec
  - https://oras.land/
  - https://github.com/oras-project/oras
  - https://github.com/containers/image
---

# Design

## Look And Feel

OCI's "design" is an HTTP API and a set of JSON media types, not a GUI. The developer surface is the registry's REST endpoints (upload and download blobs and manifests by digest, list tags) and, layered on them, the ORAS CLI verbs (push, pull, attach, manifest, blob). The conceptual model is small and content-addressed: blobs named by digest, manifests that list blobs plus a media type, and tags as mutable human-readable pointers to a manifest digest.

## Open Design Assets

- The OCI Distribution Spec documents the registry HTTP API: blob and manifest routes, digests, chunked and resumable uploads, and Range GET.
- The OCI Image Spec documents the manifest and config JSON schemas, media types, and descriptors.
- ORAS publishes CLI docs and client libraries (oras.land, oras-project/oras) for pushing and pulling arbitrary artifacts.
- containers/image documents zstd:chunked, the chunked layer format that enables partial pulls.
- All specs are open, so the digest model, manifest schema, and transfer semantics are fully specified in the open.

## Differentiators

- Content addressing by digest across an enormous installed base: nearly every registry implements the same distribution API, so the substrate is already everywhere.
- ORAS generalizes registries from container images to arbitrary artifacts, turning "OCI registry" into "content-addressed object store."
- Range GET plus chunked and resumable uploads give ranged and resumable transfer over ordinary HTTP with no special server.
- zstd:chunked pushes partial fetch down to chunk and file granularity within a layer, so a puller downloads only what it lacks.

## What Works

- The digest-addressed blob-plus-manifest model maps cleanly onto ADR-0015's external-pointer descriptor: the `blob_sha256` pointer resolves to a registry blob by digest, and the registry needs no Epoch-specific server.
- Range GET and resumable uploads are a working demonstration of the ranged, resumable transfer ADR-0015 Option 6 wants, delivered over commodity HTTP/CDN infrastructure.
- zstd:chunked shows chunk-level partial pull is achievable even inside the registry model, validating Epoch's chunk-range transport direction from an independent lineage.
- Reusing registries operators already run lowers the adoption cost of an external-pointer tier: no bespoke daemon, just a registry endpoint and credentials.

## UX Breakdowns

- The digest proves integrity but not authenticity; signing is a separate system (cosign/Notation), so trust in "who produced this" rides on a bolted-on layer. Epoch's signed manifest binds authenticity to the content by design.
- Availability, garbage collection, and retention are operator policy: a registry can GC an unreferenced blob out from under a pointer, so a clone referencing it is no longer self-contained. Epoch must treat availability as explicit rather than assumed.
- Redaction leaves the signed store: deleting bytes now depends on an external registry honoring the delete, weakening Epoch's local-first redaction guarantee.
- Tags are mutable, so only pull-by-digest is safe for identity; an external-pointer descriptor must pin the digest, never a tag.
