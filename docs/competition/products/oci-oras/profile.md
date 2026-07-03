---
product: OCI Registry / ORAS
slug: oci-oras
category: content_addressed_artifact_registry
primary_sources:
  - https://github.com/opencontainers/distribution-spec
  - https://github.com/opencontainers/image-spec
  - https://oras.land/
  - https://github.com/oras-project/oras
  - https://github.com/containers/image
---

# OCI Registry / ORAS

The OCI Distribution Spec defines the HTTP API that container registries (Docker Hub, GHCR, Amazon ECR, Harbor, Zot, and others) implement. Content is content-addressed by digest (e.g. `sha256:...`): a registry stores blobs (image layers, configs, or arbitrary bytes) and manifests (JSON documents that reference blobs by digest plus a media type), while mutable tags point at a manifest digest. ORAS ("OCI Registry As Storage") is a CLI and set of libraries that push and pull arbitrary artifacts — not just container images — as OCI blobs and manifests, so any OCI-compliant registry becomes a general content-addressed artifact store. Together they are the ubiquitous, range-capable substrate that ADR-0015's Option 11 external-pointer descriptor could reuse to hold bytes on infrastructure operators already run.

## Competitive Relevance

- Registries are content-addressed by digest: pull-by-digest is immutable (the bytes must match the hash), while tags are mutable pointers to a manifest digest.
- A manifest is a small JSON document that references blobs by digest and media type; blobs are the actual bytes (layers, configs, or, via ORAS, arbitrary files).
- ORAS lets any OCI-compliant registry act as a general artifact store, pushing arbitrary files as blobs under a manifest, so the same registries teams already run for containers can hold datasets, models, or other large assets.
- Ranged and resumable transfer: registries serve blobs over HTTP and support Range GET, so a client can fetch byte ranges or resume a layer download; uploads are chunked and resumable per the distribution spec.
- zstd:chunked (from containers/image, used by Podman) is a layer format that embeds a table of chunk offsets and digests, so a puller can fetch only the missing chunks or files across layers — chunk-level dedup and partial pulls within the OCI model.
- Integrity is intrinsic (the digest proves the bytes match the hash), but authenticity and signing are layered on separately via Sigstore cosign or Notation, not built into the registry.
- Availability, garbage collection (registries GC unreferenced blobs), and retention are registry-operator concerns rather than properties of the content model.
- The ecosystem is enormous: essentially every cloud and self-hosted registry speaks the same distribution API, so the substrate is already deployed nearly everywhere.

## Epoch Implications

- OCI + ORAS is the ubiquitous, content-addressed, range-capable substrate for ADR-0015's Option 11 external-pointer descriptor: Epoch records a signed pointer while an OCI registry holds the bytes, referenced by digest, on infrastructure operators already run.
- zstd:chunked independently validates chunk-level partial fetch (ADR-0015 Option 6 chunk-range transport) even inside a registry world, so "fetch only the missing chunks" is not unique to a bespoke store.
- But OCI makes ADR-0015's trade-off concrete: with an external registry, availability, garbage collection, and redaction leave the signed store, and signing is bolted on (cosign/Notation) rather than intrinsic to the content model.
- Epoch's advantage is the signed manifest with `blob_sha256` bound to the full content: an untrusted registry can hold bytes because verification, not the registry, decides acceptance — "transport moves bytes, verification decides whether bytes are acceptable."
- This is exactly why Option 11 stays opt-in rather than the default: the registry buys ubiquity and range transfer, but Epoch must keep identity, integrity, and redaction anchored in the signed local store.
