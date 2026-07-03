@competition @s3-minio
Feature: Ranged object storage over an S3-compatible store
  Amazon S3 and MinIO expose durable objects addressed by (bucket, key), with Range GETs
  for arbitrary byte ranges, multipart upload for large resumable writes, and lifecycle and
  versioning policy on the bucket. This is the external-pointer substrate ADR-0015 Option 11
  names and the byte-range primitive Option 6's chunk-range transport rides.

  Scenario: Storing large content via multipart upload keyed by content hash
    Given a large object an operator chooses to name by its content hash
    When the client uploads it as parallel multipart parts assembled server-side
    Then the object is stored durably under its (bucket, key) with parts resumable on failure
    And the key encodes a content hash even though the store is not content-addressed by default

  Scenario: Fetching only the byte range a client needs with a Range GET
    Given a stored object and a client that needs a single chunk by offset and length
    When the client issues an HTTP Range GET for exactly that byte range
    Then only the requested bytes are transferred, not the whole object
    And that byte range is the chunk-range primitive Epoch's Option 6 transport rides on

  Scenario: Managing retention outside any signed store via lifecycle and versioning
    Given a bucket with object versioning and a lifecycle policy configured
    When a lifecycle rule expires an object or tiers it to colder storage
    Then availability and retention are decided in the bucket, outside any signed store
    And Epoch must bind a signed manifest so verification, not the bucket, decides acceptance
