@competition @restic
Feature: Content-defined deduplicated backup
  restic backs up files as content-defined chunks, content-addressed by SHA-256,
  aggregated into encrypted pack files with an index, and referenced by snapshot trees.
  It is prior art for Epoch's chunk-store-plus-manifest direction (ADR-0015 Option 2),
  including the chunk-before-encrypt ordering and reachability-based garbage collection.

  Scenario: Producing packs and an index from a backup via content-defined chunking
    Given a set of files to back up into a restic repository
    When restic splits each file with a Rabin-fingerprint content-defined chunker on plaintext
    Then each chunk is content-addressed by SHA-256 and encrypted, then written into pack files
    And an index maps every blob ID to its pack, offset, and length
    And a snapshot references a tree that lists the ordered blob IDs for each file

  Scenario: An incremental backup transfers only new chunks
    Given an existing snapshot whose chunks are already in the repository
    When restic backs up a lightly changed version of the same files
    Then content-defined boundaries shift only near the change
    And chunks that already exist are deduplicated against the whole repository
    And only the new chunks are encrypted, packed, and uploaded

  Scenario: Pruning unreferenced chunks by snapshot reachability
    Given several snapshots that share chunks and some snapshots have been forgotten
    When restic prune walks the remaining snapshots as roots
    Then blobs not reachable from any snapshot are removed
    And partially-used packs are repacked to reclaim space
