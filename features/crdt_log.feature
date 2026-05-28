Feature: Operation-based CRDT event log
  Epoch stores CRDT operations as signed write-only events and materializes convergent views.

  Scenario: Offline agents converge independent map updates after sync
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I append CRDT map value for "tasks" key "alice" as "alice" with JSON {"status":"draft"}
    And the peer appends CRDT map value for "tasks" key "bob" as "bob" with JSON {"status":"review"}
    And I sync with the peer repository
    Then the repository materialized view "tasks" equals JSON:
      """
      {"alice":{"status":"draft"},"bob":{"status":"review"}}
      """
    And the peer materialized view "tasks" equals JSON:
      """
      {"alice":{"status":"draft"},"bob":{"status":"review"}}
      """

  Scenario: One actor can append repeated map updates to the same CRDT entity
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I append CRDT map value for "counter" key "count" as "alice" with JSON 1
    And I append CRDT map value for "counter" key "count" as "alice" with JSON 2
    Then the repository materialized view "counter" equals JSON:
      """
      {"count":2}
      """

  Scenario: Offline agents converge concurrent text inserts after sync
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I append CRDT text "A" to "doc" as "alice"
    And the peer appends CRDT text "B" to "doc" as "bob"
    And I sync with the peer repository
    Then the repository materialized view "doc" equals text "AB"
    And the peer materialized view "doc" equals text "AB"
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for crdt_log.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/crdt_log.feature | A GitHub open-source contributor | Preserving Agency And Portability | degraded state | keep collaborative map and text work moving while offline |
