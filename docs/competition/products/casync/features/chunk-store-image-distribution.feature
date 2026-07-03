@competition @casync
Feature: Chunk-store image distribution
  casync distributes filesystem images as content-defined chunks in a plain-file store,
  with an ordered chunk-hash index as the manifest and local data usable as a seed.
  It is prior art for Epoch's store-plus-manifest-plus-seed chunked transport.

  Scenario: Producing an index and chunk store from a directory tree
    Given a directory tree serialized into a reproducible .catar stream
    When casync applies buzhash content-defined chunking with file boundaries removed
    Then chunks are zstd-compressed and addressed by SHA-512/256 in a .castr store
    And a .caidx index records the ordered list of chunk hashes as the manifest

  Scenario: Client downloads only the chunks it lacks
    Given a client with an existing local tree to use as a seed
    When the client fetches the index from an HTTP, CDN, S3, or SSH store
    Then the client reuses matching chunks already present locally
    And only the missing chunks are downloaded from the chunk store

  Scenario: Mounting an image lazily over FUSE
    Given a desync client with access to an index and a remote chunk store
    When the image is mounted over FUSE instead of fully extracted
    Then chunks are fetched on access as files are read
    And the full image is never materialized unless every file is touched
