---
product: OCI Registry / ORAS
gossip_sources:
  - https://github.com/opencontainers/distribution-spec
  - https://github.com/opencontainers/image-spec
  - https://oras.land/
  - https://github.com/oras-project/oras
  - https://github.com/containers/image
---

# Gossip

As open specifications and open-source tooling, OCI/ORAS "gossip" is practitioner sentiment expressed through the OCI and ORAS repositories, registry-operator experience, and cloud-native community discussion.

## What People Say

- Practitioners value that one distribution API spans nearly every registry vendor, so content-addressed distribution is a solved, portable problem.
- ORAS is well regarded for turning familiar registries into general artifact stores without standing up new infrastructure.
- Content addressing by digest is praised for reproducible, immutable pull-by-digest.
- zstd:chunked is noted as a clever way to get chunk-level dedup and partial pulls inside the existing OCI model.

## Bug And Friction Themes

- Signing is separate and sometimes confusing: teams conflate the digest (integrity) with authenticity, then discover they still need cosign or Notation.
- Garbage collection and retention behavior varies by registry, and unreferenced blobs can disappear, surprising users who assumed durability (secondary detail; varies by operator).
- Tag mutability trips people up: pulling by tag is not reproducible, whereas pull-by-digest is immutable.
- ORAS artifact and referrers behavior has evolved across spec revisions, so compatibility depends on registry support (secondary detail; do not assume a specific version).

## Product Risk For Epoch

- OCI validates the external-pointer direction so strongly that Epoch's differentiation must be crisp: the registry provides ubiquity and range transfer, but identity, authenticity, and redaction must stay in Epoch's signed store.
- Because registry signing is bolted on, Epoch's intrinsic signed manifest is an advantage, but only if `blob_sha256` binds the full content and verification, not the registry, decides acceptance.
- The "registry GC can remove a blob" behavior warns Epoch that pointing at an external store is not an availability guarantee; Option 11 must treat availability and redaction as explicit, monitored concerns.
- Reusing OCI as a substrate is low-risk and high-value for an opt-in tier; the risk is letting it become the default and quietly moving Epoch's trust properties out of the local-first store.
