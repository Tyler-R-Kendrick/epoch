Feature: Epoch repository event log
  Epoch stores immutable content-addressed events in a local repository.

  Scenario: Initialize and record a file
    Given a new workspace
    When I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then the repository verifies successfully
    And the event log contains 1 event

  Scenario: Detect tampered event content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded event size
    Then repository verification reports "content hash mismatch"
