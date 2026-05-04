Feature: Operation-based CRDT event log
  Epoch stores CRDT operations as signed write-only events and materializes convergent views.

  Scenario: Offline agents converge independent map updates after anti-entropy
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I append CRDT map value for "tasks" key "alice" as "alice" with JSON {"status":"draft"}
    And the peer appends CRDT map value for "tasks" key "bob" as "bob" with JSON {"status":"review"}
    And I run anti-entropy with the peer repository
    Then the repository CRDT view "tasks" equals JSON:
      """
      {"alice":{"status":"draft"},"bob":{"status":"review"}}
      """
    And the peer CRDT view "tasks" equals JSON:
      """
      {"alice":{"status":"draft"},"bob":{"status":"review"}}
      """

  Scenario: Offline agents converge concurrent text inserts after anti-entropy
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I append CRDT text "A" to "doc" as "alice"
    And the peer appends CRDT text "B" to "doc" as "bob"
    And I run anti-entropy with the peer repository
    Then the repository CRDT view "doc" equals text "BA"
    And the peer CRDT view "doc" equals text "BA"
