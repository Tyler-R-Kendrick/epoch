@competition @vfs-for-git
Feature: On-demand object hydration
  VFS for Git makes an entire monorepo appear present while hydrating file content on first access, and Scalar reaches similar scale with portable partial clone plus sparse-checkout.
  The design lets Git operations skip un-hydrated files so status and checkout scale to millions of files.

  Scenario: File content hydrates on first open
    Given a repository is mounted through the virtual filesystem
    And a file has not yet been hydrated
    When a process opens that file for the first time
    Then the provider downloads the object on demand via the GVFS objects endpoint
    And the file content becomes present in the working tree

  Scenario: Git operations skip un-hydrated files
    Given most files in a huge repository are not yet hydrated
    When the user runs a status or checkout operation
    Then un-hydrated files are treated as unchanged and skipped
    And the operation completes at a scale that plain Git could not handle

  Scenario: Scalar clones with partial clone and sparse-checkout
    Given a developer runs scalar clone against a large repository
    When the client applies a blob:none partial-clone filter and cone sparse-checkout
    Then only the needed objects and a sparse working tree are materialized
    And missing blobs are backfilled on demand, using the GVFS protocol where available
