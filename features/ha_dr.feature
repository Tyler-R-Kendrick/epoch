Feature: High availability and disaster recovery
  Epoch can compact logs, bootstrap from seeds, and restore cold backups.

  @persona.github_open_source_contributor
  Scenario: Compact pruning and restoration
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "one.txt" with content "one\n" as "text/plain"
    And I record "two.txt" with content "two\n" as "text/plain"
    And I create an HA compact
    And I record "three.txt" with content "three\n" as "text/plain"
    And I prune the event log before the HA compact
    Then the local event file count is 1
    When I restore from the HA compact
    Then the repository verifies successfully
    And the event log contains 3 events

  @persona.github_open_source_contributor
  Scenario: Pruned compacts remain trusted parents for new events
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "one.txt" with content "one\n" as "text/plain"
    And I create an HA compact
    And I prune the event log before the HA compact
    Then the local event file count is 0
    When I record "two.txt" with content "two\n" as "text/plain"
    Then the repository verifies successfully
    And the event log contains 1 event

  @persona.github_open_source_contributor
  Scenario: Targeted compacts restore with later tail events
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "one.txt" with content "one\n" as "text/plain"
    And I remember the last event as "compact-boundary"
    And I record "two.txt" with content "two\n" as "text/plain"
    And I create an HA compact targeting remembered event "compact-boundary"
    When I restore from the HA compact
    Then the repository verifies successfully
    And the event log contains 2 events

  @persona.github_open_source_contributor
  Scenario: Fresh peer bootstraps from a trusted seed
    Given a new workspace
    And I initialize an Epoch repository as "seed"
    When I record "seed.txt" with content "available\n" as "text/plain"
    And I create an HA compact
    And a peer Epoch repository initialized as "peer"
    And the peer bootstraps from the repository seed
    Then the peer repository verifies successfully
    And the peer event log contains 1 event

  @persona.github_open_source_contributor
  Scenario: Seed bootstrap rejects an unexpected seed identity
    Given a new workspace
    And I initialize an Epoch repository as "seed"
    When I record "seed.txt" with content "available\n" as "text/plain"
    And I create an HA compact
    And a peer Epoch repository initialized as "peer"
    And the peer tries to bootstrap from the repository seed as "other-seed"
    Then seed bootstrap fails with "identity mismatch"

  @persona.github_open_source_contributor
  Scenario: Cold backup restores a repository
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "backup.txt" with content "durable\n" as "text/plain"
    And I create a cold backup
    And I restore the cold backup into a fresh repository
    Then the peer repository verifies successfully
    And the peer event log contains 1 event

  @persona.github_open_source_contributor
  Scenario: Cold backup restores tail events and blobs after its compact
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record "one.txt" with content "one\n" as "text/plain"
    And I create an HA compact
    And I record "two.txt" with content "two\n" as "text/plain"
    And I create a cold backup from the HA compact
    And I restore the cold backup into a fresh repository
    Then the peer repository verifies successfully
    And the peer event log contains 2 events
    And the peer file "one.txt" blob content equals "one\n"
    And the peer file "two.txt" blob content equals "two\n"
