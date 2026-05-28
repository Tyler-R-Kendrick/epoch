Feature: Operation-based CRDT event log
  Epoch stores CRDT operations as signed write-only events and materializes convergent views.

  @persona.github_open_source_contributor
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

  @persona.github_open_source_contributor
  Scenario: One actor can append repeated map updates to the same CRDT entity
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I append CRDT map value for "counter" key "count" as "alice" with JSON 1
    And I append CRDT map value for "counter" key "count" as "alice" with JSON 2
    Then the repository materialized view "counter" equals JSON:
      """
      {"count":2}
      """

  @persona.github_open_source_contributor
  Scenario: Offline agents converge concurrent text inserts after sync
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I append CRDT text "A" to "doc" as "alice"
    And the peer appends CRDT text "B" to "doc" as "bob"
    And I sync with the peer repository
    Then the repository materialized view "doc" equals text "AB"
    And the peer materialized view "doc" equals text "AB"
