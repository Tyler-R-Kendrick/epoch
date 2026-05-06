@competition @radicle
Feature: Sovereign peer-to-peer forge
  Radicle lets developers collaborate without a central forge owner.

  Scenario: Maintainer publishes a repository through a Radicle node
    Given a maintainer has a Git repository
    When the maintainer initializes Radicle identity and seeds the project
    Then peers can replicate the repository without depending on GitHub
    And signed repository metadata establishes authorship and authenticity

  Scenario: Contributor submits a patch
    Given a contributor has cloned a Radicle project
    When the contributor opens a patch
    Then the patch, review discussion, and revisions are stored as signed collaborative objects
    And the workflow remains available locally when the network is unavailable

