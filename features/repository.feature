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

  Scenario: Intent merge signatures advance the main projection
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "hello\n" as "text/plain"
    Then the last intent status is "pending"
    When "bob" signs the intent merge
    And "carol" signs the intent merge
    Then the last intent status is "merged"
    And the main projection contains the last intent
    Then the repository verifies successfully
    And the event log contains 3 events

  Scenario: Rejected intents remain on the ledger but are skipped by main
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "bad\n" as "text/plain"
    And "bob" rejects the intent with reason "not ready"
    Then the last intent status is "rejected"
    And the main projection skips the last intent
    And the event log contains 2 events

  Scenario: Intent workflow events carry signed metadata
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "hello\n" as "text/plain" titled "Update note" described "Adds greeting" labeled "docs,ready"
    Then the last event metadata title is "Update note"
    And the last event metadata description is "Adds greeting"
    And the last event metadata labels are "docs,ready"
    When "bob" signs the intent merge with reason "looks good" labeled "reviewed"
    Then the last event metadata reason is "looks good"
    And the last event metadata labels are "reviewed"
    When "carol" comments "Please add tests" on the intent labeled "review"
    Then the last event comment body is "Please add tests"
    And the last event comment references the last intent
    And the last event metadata labels are "review"
    When "dave" rejects the intent with reason "needs changes" labeled "blocked"
    Then the last event metadata reason is "needs changes"
    And the last event metadata labels are "blocked"
    And the event log contains 4 events

  Scenario: Import from and export to Git repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a Git repository with "docs/readme.md" containing "from git\n"
    When I import the Git repository
    Then the repository verifies successfully
    And the event log contains 1 event
    When I export to a Git repository
    Then the exported Git file "docs/readme.md" contains "from git\n"
