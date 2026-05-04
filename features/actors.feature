Feature: XState actor-driven Epoch repository
  Epoch coordinates repository work through asynchronous XState actors.

  Scenario: Asynchronous actor repository records and verifies a file
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And I asynchronously record "note.txt" with content "hello\n" as "text/plain"
    Then the actor repository verifies successfully
    And the actor event log contains 1 event
    And the actor events include authors "alice"

  Scenario: Concurrent actor users append independent events
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And actor users concurrently record:
      | author | path      | content       | entityType |
      | alice  | alice.txt | from alice\n  | text/plain |
      | bob    | bob.txt   | from bob\n    | text/plain |
    Then the actor repository verifies successfully
    And the actor event log contains 2 events
    And the actor events include authors "alice,bob"
    And actor event authors have distinct signing keys

  Scenario: Actor anti-entropy synchronizes with a peer asynchronously
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And I asynchronously record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I run actor anti-entropy with the peer repository
    Then the actor repository verifies successfully
    And the peer repository verifies successfully
    And the peer event log contains 1 event
