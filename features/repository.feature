Feature: Epoch repository event log
  Epoch stores immutable content-addressed events in a local repository.

  Scenario: Initialize and record a file
    Given a new workspace
    When I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then the repository verifies successfully
    And the event log contains 1 event
    And the recorded blob content equals "hello\n"
    And the repository identity uses Ed25519 keys
    And the recorded event is signed

  Scenario: Detect tampered event content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded event size
    Then repository verification reports "content hash mismatch"

  Scenario: Detect tampered blob content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded blob content
    Then repository verification reports "blob hash mismatch"

  Scenario: Reject files outside the repository root
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I try to record "../outside.txt" with content "secret\n" as "text/plain"
    Then recording fails with "outside repository root"

  Scenario: Sync command surface synchronizes repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I sync with the peer repository
    Then the peer repository verifies successfully
    And the peer event log contains 1 event
    And the peer recorded blob content equals "hello\n"

  Scenario: Branching and rollback are recorded as events
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I create branch "feature"
    Then the branch list contains "feature"
    When I rollback to the last event
    Then the repository verifies successfully
    And the event log contains 3 events

  Scenario: Import from and export to Git repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a Git repository with "docs/readme.md" containing "from git\n"
    When I import the Git repository
    Then the repository verifies successfully
    And the event log contains 1 event
    When I export to a Git repository
    Then the exported Git file "docs/readme.md" contains "from git\n"
