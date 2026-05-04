Feature: Named views
  Epoch computes isolated logical views over the shared event log.

  Scenario: Feature view isolates local proposals from main
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "main\n" as "text/plain"
    When I create view "exp/fast-algo" from "main"
    And I checkout view "exp/fast-algo"
    And I record "note.txt" with content "experiment\n" as "text/plain"
    Then view "main" has file "note.txt" with content "main\n"
    And view "exp/fast-algo" has file "note.txt" with content "experiment\n"
    And the current view is "exp/fast-algo"

  Scenario: Promotion to main remains gated until approval
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "main\n" as "text/plain"
    And I approve the last recorded proposal as "bob"
    And I create view "feature/login" from "main"
    And I checkout view "feature/login"
    And I record "note.txt" with content "login\n" as "text/plain"
    When I promote view "feature/login" to "main"
    Then view "main" requiring 1 approval has file "note.txt" with content "main\n"
    When I approve the last recorded proposal as "bob"
    Then view "main" requiring 1 approval has file "note.txt" with content "login\n"

  Scenario: Rejection excludes a proposal from main
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "main\n" as "text/plain"
    When I reject the last recorded proposal as "bob"
    Then view "main" has no file "note.txt"

  Scenario: Blue and green deployment views differ by stop proposal
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "deploy.txt" with content "blue\n" as "text/plain"
    And I remember the last proposal as "blue"
    And I record "deploy.txt" with content "green\n" as "text/plain"
    When I create view "production-blue" with until all rule stopped at remembered proposal "blue"
    And I create view "production-green" from "main"
    Then view "production-blue" has file "deploy.txt" with content "blue\n"
    And view "production-green" has file "deploy.txt" with content "green\n"
