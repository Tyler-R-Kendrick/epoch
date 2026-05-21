@competition @the_update_framework @supply_chain_update_security @signed_metadata
Feature: Signed update metadata verification
  TUF lets update clients verify repository content through signed metadata roles
  before trusting a downloaded target.

  Scenario: Client verifies an update target
    Given an update client has trusted root metadata
    And a repository publishes timestamp, snapshot, and targets metadata
    When the client requests a package update
    Then it verifies the metadata signatures and versions
    And it rejects targets that do not match trusted metadata

  Scenario: Maintainer delegates trust to a package owner
    Given a repository contains packages owned by different teams
    When the repository maintainer creates delegated target metadata
    Then the package owner can sign only the paths in its delegation
    And clients can verify that the delegated signature matches the trusted role

  Scenario: Client detects stale repository metadata
    Given an attacker serves old repository metadata
    When the update client checks the metadata expiration and version fields
    Then it rejects frozen or rolled-back metadata
    And it avoids installing an update from an untrusted repository state
