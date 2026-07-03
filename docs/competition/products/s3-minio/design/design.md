---
product: Amazon S3 / MinIO
design_sources:
  - https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
  - https://min.io/docs/minio/linux/index.html
  - https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html
---

# Design

## Look And Feel

S3 and MinIO have no application UI in the sense a forge does; their "design" is the HTTP object API and its verbs. The conceptual surface is small and stable: buckets contain objects addressed by key, and clients issue PUT/GET/DELETE plus a `Range` GET for partial reads, multipart upload for large writes, and lifecycle and versioning configuration on the bucket. MinIO presents the same API and adds an operator console and `mc` CLI for self-hosted clusters.

## Open Design Assets

- The Amazon S3 API reference and user guide document the request/response contract: object operations, the `Range` header, multipart upload, versioning, lifecycle, presigned URLs, and checksum options.
- The MinIO documentation covers the self-hostable server, its S3 compatibility surface, and the erasure-coding and bitrot-detection durability model.
- Because MinIO is open source and S3-compatible, the wire protocol is effectively an open, widely reimplemented contract rather than a single vendor's secret.

## Differentiators

- Addressing by `(bucket, key)` rather than by content, so the store is a general-purpose key-to-bytes map — flexible, but not content-addressed or self-verifying unless the operator makes keys hashes.
- **Range GET** as a first-class primitive: any object is randomly readable by byte offset and length, the natural transport unit for chunked or streamed access.
- **Multipart upload** for parallel, resumable large writes assembled server-side.
- **Erasure coding** (MinIO) for durability on commodity drives and nodes, reconstructing objects from a subset of shards, with per-object hashing for bitrot detection.

## What Works

- Range GET is precisely the byte-range fetch ADR-0015 Option 6's chunk-range transport wants: Epoch can pull one chunk (offset, length) straight from a dumb object store with no special server, and multipart upload supplies the resumable large-write side.
- Serving bytes from ubiquitous, commodity S3-compatible infrastructure is a clean fit for Epoch's external-pointer descriptor (Option 11), letting availability ride on storage operators already run.
- MinIO's erasure coding demonstrates durability without a bespoke daemon (compare Tahoe-LAFS), so the external substrate can be reliable on its own terms.
- Optional additional checksums (SHA-256 among them) show the store can carry a content hash alongside bytes, easing the join to Epoch's `blob_sha256`.

## UX Breakdowns

- The store is not content-addressed by default: the key-to-bytes binding is whatever the operator wrote, so the same key can be made to return different bytes. Epoch must bind `blob_sha256` in a signed manifest and verify on arrival rather than trust the key.
- There is no built-in signing or authenticity; trust rests on the account, credentials, and operator. ETag is an MD5 for single-part uploads and not a content hash for multipart, so it cannot stand in for Epoch's identity hash.
- Availability, garbage collection, lifecycle expiry, and versioning all live in the bucket, outside any signed store — exactly why Option 11 stays opt-in, since a lifecycle rule can delete bytes `verify` still expects to exist.
- The API is operations-oriented (credentials, buckets, policies); Epoch must hide that behind its own materialization and verification UX so a bucket is a byte tier, not a trust boundary users must reason about.
