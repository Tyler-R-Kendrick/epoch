Feature: XState actor-driven Epoch repository
  Epoch coordinates repository work through asynchronous XState actors.

  @persona.github_open_source_contributor
  Scenario: Asynchronous actor repository records and verifies a file
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And I asynchronously record "note.txt" with content "hello\n" as "text/plain"
    Then the actor repository verifies successfully
    And the actor event log contains 1 event
    And the actor events include authors "alice"

  @persona.github_open_source_contributor
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

  @persona.github_open_source_contributor
  Scenario: Actor event sync converges with a peer asynchronously
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And I asynchronously record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I run actor sync with the peer repository
    Then the actor repository verifies successfully
    And the peer repository verifies successfully
    And the peer event log contains 1 event

  @persona.github_open_source_contributor
  Scenario: Actor upgrades an existing repository without user identity storage
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And the actor user identity directory is missing
    When I start an Epoch actor for the existing repository
    And actor users concurrently record:
      | author | path    | content      | entityType |
      | bob    | bob.txt | from bob\n   | text/plain |
    Then the actor repository verifies successfully
    And the actor event log contains 1 event
    And the actor events include authors "bob"
