---
product: Amazon S3 / MinIO
marketing_sources:
  - https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
  - https://min.io/docs/minio/linux/index.html
  - https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html
---

# Marketing

Amazon S3 is a commercial hosted service and MinIO is an open-source, self-hostable server, so their positioning spans a managed-cloud pitch and a bring-your-own-hardware one, unified by a single S3 API.

## Target Customers

- Application and data teams needing durable, scalable object storage behind a simple `(bucket, key)` API.
- Platform teams wanting an S3-compatible store on their own hardware or private cloud (MinIO) rather than a hosted dependency.
- Media, backup, and analytics workloads that stream or range-read large objects and want partial reads without full downloads.
- Systems that need resumable large uploads (multipart) and policy-driven retention or tiering (lifecycle, versioning).

## Positioning

S3 is positioned as effectively-infinite, durable object storage with a stable API and a broad ecosystem; MinIO positions the same API as software you run yourself for performance, sovereignty, or cost, backed by erasure coding for durability on commodity hardware. The shared message is "durable bytes behind a simple, ubiquitous HTTP object API," with Range GET, multipart upload, versioning, and lifecycle as the standard toolbox.

## Customer Model

- S3 is consumption-priced managed storage; MinIO is open-source software an operator deploys and runs.
- The S3 API is a de facto standard, so tooling, SDKs, and integrations transfer across both and across other compatible stores.
- Value is durability, scale, and the ubiquity of the API rather than any versioning or authorship semantics.
- Presigned URLs and IAM-style policies frame access control around accounts and credentials, not signed content.

## Captures

- Large-object workloads that benefit from range reads and resumable multipart writes.
- Teams standardizing on the S3 API for portability across hosted and self-hosted deployments.
- Durability-sensitive storage on commodity hardware via MinIO erasure coding.
- Retention and tiering use cases handled by lifecycle policies and object versioning.

## Misses

- Content addressing: keys are operator-defined, so the store does not self-verify bytes by hash.
- Authenticity: no built-in signing, so trust rests on credentials and the operator.
- Version control: object versioning is per-key history, not branching, merge, or authorship.
- Self-contained integrity: availability, GC, and retention live in the bucket, so bytes can vanish under a lifecycle rule.
