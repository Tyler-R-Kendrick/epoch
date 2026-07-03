---
product: Amazon S3 / MinIO
slug: s3-minio
category: object_storage
primary_sources:
  - https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
  - https://min.io/docs/minio/linux/index.html
  - https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html
---

# Amazon S3 / MinIO

Amazon S3 is a hosted object storage service; MinIO is an S3-API-compatible, self-hostable object store that speaks the same protocol on commodity hardware. Both address objects by a `(bucket, key)` pair rather than by content, exposing PUT/GET/DELETE, HTTP `Range` GETs for arbitrary byte ranges, multipart upload for large objects, per-key versioning, and lifecycle policies. They are the concrete "S3-compatible object store" ADR-0015 Option 11 names as the external-pointer substrate, and their Range GET is the exact primitive Option 6's chunk-range transport rides.

## Competitive Relevance

- The object model is `(bucket, key) -> bytes`; the key-to-bytes mapping is operator-defined, so S3/MinIO is **not content-addressed by default** — though an operator can name objects by a content hash to make it so.
- Core operations are PUT/GET/DELETE on objects, plus a **Range GET** (HTTP `Range` header) that fetches an arbitrary byte range of an object without transferring the whole thing.
- **Multipart upload** splits a large object into parts uploaded in parallel and resumed on failure, then assembled server-side — the resumable large-write path.
- **Object versioning** keeps prior versions of a key under per-version IDs; **lifecycle policies** expire objects or tier them to colder storage on a schedule.
- **Presigned URLs** grant time-limited delegated access to a specific object without sharing credentials. S3 documents strong read-after-write consistency.
- Integrity is by **ETag** (an MD5 for single-part uploads, but not a content hash for multipart) plus optional **additional checksums** (CRC32/CRC32C/SHA-1/SHA-256) requested per upload/download; there is **no built-in signing or authenticity**.
- **MinIO** stores objects with **erasure coding** across drives and nodes (reconstructing data from a subset of shards) and detects **bitrot** via per-object hashing, giving durability on commodity hardware.

## Epoch Implications

- S3/MinIO is the object store ADR-0015 Option 11 names as the **external-pointer** substrate: somewhere to put bytes on commodity or self-hosted infrastructure operators already run.
- **Range GET is exactly the primitive Option 6's chunk-range transport needs** — Epoch can fetch an individual chunk by offset and length directly from a dumb object store, and **multipart upload** gives it resumable large writes.
- But S3 is **not content-addressed and not signed**: the key-to-bytes binding is pure operator trust. Epoch supplies the missing piece — `blob_sha256` and chunk hashes bound into a **signed manifest** — so an untrusted bucket can hold bytes while verification decides acceptance ("transport moves bytes, verification decides").
- This is why external-pointer stays **opt-in**: availability, garbage collection, lifecycle, and retention live in the bucket, outside the signed store, so a clone is no longer self-contained.
- **MinIO's erasure coding** is availability prior art (compare Tahoe-LAFS), showing durability on commodity hardware without a bespoke daemon.
