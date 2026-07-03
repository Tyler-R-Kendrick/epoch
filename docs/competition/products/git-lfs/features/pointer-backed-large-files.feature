@competition @git-lfs
Feature: Pointer-backed large files
  Git LFS replaces large files with small SHA-256 pointer files and moves the real bytes to a separate object store via clean/smudge filters and the Batch API.
  It is efficient to adopt because it reuses ordinary Git verbs, but stores every version as a full copy with no delta.

  Scenario: Clean filter writes a pointer on add
    Given a path is tracked by Git LFS through .gitattributes
    When the user runs git add on a large file
    Then the clean filter stores the real bytes in the local LFS object store named by SHA-256
    And the staged blob becomes a pointer file containing version, oid sha256, and size

  Scenario: Smudge filter hydrates content on checkout
    Given a committed pointer file references an LFS object by oid
    When the user checks out the commit
    Then the smudge or filter-process driver locates the object locally or downloads it via the Batch API
    And the working tree contains the expanded full file content

  Scenario: Targeted fetch pulls only selected paths
    Given a repository stores many large files across different directories
    When the user sets GIT_LFS_SKIP_SMUDGE or runs git lfs pull with an include path
    Then only the selected large-file objects are downloaded
    And the history of unselected large files is not materialized locally
