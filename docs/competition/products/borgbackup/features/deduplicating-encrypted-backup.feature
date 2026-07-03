@competition @borgbackup
Feature: Deduplicating encrypted backup
  BorgBackup chunks data with a buzhash rolling hash, then compresses and encrypts
  each chunk, deduplicating by a keyed chunk id so unchanged data is never re-stored,
  into an append-only repository under a single-writer lock.
  It is prior art for Epoch's chunk-compress-encrypt pipeline and append-only,
  single-writer repository model.

  Scenario: First backup chunks, compresses, and encrypts into segments
    Given a repository initialized with encryption enabled
    When borg creates the first archive from a directory of files
    Then the data is split into content-defined chunks by a buzhash rolling hash
    And each chunk is compressed then encrypted and authenticated before storage
    And the chunks are appended to segment files with a manifest listing the archive

  Scenario: Second backup deduplicates unchanged chunks via the chunk cache
    Given a repository that already contains a first archive
    When borg creates a second archive after a small change
    Then each chunk's keyed HMAC-SHA256 id is looked up in the local chunk cache
    And chunks whose ids already exist are referenced rather than re-stored
    And only the changed chunks are compressed, encrypted, and appended

  Scenario: Prune and compact reclaim repository space
    Given a repository with several archives held under a retention policy
    When borg prune removes the archives that fall outside the retention policy
    And borg compact rewrites segments to drop unreferenced chunks
    Then chunks no longer referenced by any archive are freed
    And the repository reclaims the space those chunks occupied
