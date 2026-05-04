Feature: High availability and disaster recovery
  Epoch can compact logs, bootstrap from seeds, and restore cold backups.

  Scenario: Checkpoint pruning and restoration
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "one.txt" with content "one\n" as "text/plain"
    And I record "two.txt" with content "two\n" as "text/plain"
    And I record "three.txt" with content "three\n" as "text/plain"
    And I create an HA checkpoint
    And I prune the event log before the HA checkpoint
    Then the local event file count is 1
    When I restore from the HA checkpoint
    Then the repository verifies successfully
    And the event log contains 3 events

  Scenario: Fresh peer bootstraps from a trusted seed
    Given a new workspace
    And I initialize an Epoch repository as "seed"
    When I record "seed.txt" with content "available\n" as "text/plain"
    And I create an HA checkpoint
    And a peer Epoch repository initialized as "peer"
    And the peer bootstraps from the repository seed
    Then the peer repository verifies successfully
    And the peer event log contains 1 event

  Scenario: Cold backup restores a repository
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "backup.txt" with content "durable\n" as "text/plain"
    And I create a cold backup
    And I restore the cold backup into a fresh repository
    Then the peer repository verifies successfully
    And the peer event log contains 1 event
