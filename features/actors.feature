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

  Scenario: Actor event sync converges with a peer asynchronously
    Given a new workspace
    When I start an Epoch actor repository as "alice"
    And I asynchronously record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I run actor sync with the peer repository
    Then the actor repository verifies successfully
    And the peer repository verifies successfully
    And the peer event log contains 1 event

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
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for actors.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/actors.feature | A GitHub open-source contributor | Trusting Current State | identity | contribute through asynchronous actor workflows while preserving authorship |
