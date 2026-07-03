@competition @diversion
Feature: Native large-file cloud VCS
  Diversion positions large files as first-class in a cloud-native, serverless VCS where repository operations are REST calls against distributed storage.
  Claims below reflect vendor marketing; internals such as chunking and content addressing are unconfirmed.

  Scenario: Commit a large binary asset without LFS setup
    Given a studio tracks a 500 MB level file alongside small config files
    When an artist commits changes to the large asset
    Then Diversion handles the large file natively with no LFS configuration
    And the commit is recorded through a cloud REST operation
    # Vendor claim: no file-size limits and no LFS setup required

  Scenario: Clone a huge repository quickly
    Given a repository contains millions of files at terabyte scale
    When a new team member clones the repository
    Then only the content the working set needs is fetched
    And the clone completes far faster than a full Git or LFS download
    # Vendor/marketing performance figures; not independently verified

  Scenario: Sync fetches only the working set
    Given a large repository is stored in Diversion's cloud
    When a user opens or updates a subset of assets
    Then the client fetches only the content required for that working set
    And unneeded large-file history is not materialized locally
