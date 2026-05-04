Feature: Epoch repository event log
  Epoch stores immutable content-addressed events in a local repository.

  Scenario: Initialize and record a file
    Given a new workspace
    When I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then the repository verifies successfully
    And the event log contains 1 event
    And the recorded blob content equals "hello\n"

  Scenario: Detect tampered event content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded event size
    Then repository verification reports "content hash mismatch"

  Scenario: Reject files outside the repository root
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I try to record "../outside.txt" with content "secret\n" as "text/plain"
    Then recording fails with "outside repository root"
