Feature: Version controlled SQL database
  Dolt differentiates by making branch, diff, merge, and pull request workflows operate on SQL tables.
  The implementation is strong when users need auditable data changes and reproducible database states.
  The implementation is weaker when teams expect perfect MySQL parity, Postgres-native behavior, or simple non-technical UX.

  Background:
    Given a team maintains shared relational data
    And the team needs to inspect and review data changes before production use

  Scenario: Developer creates a branch and proposes a data change
    Given the developer has cloned a Dolt database
    When the developer checks out a branch
    And updates table rows through SQL or the Dolt CLI
    And commits the changed schema or data
    Then Dolt records the change in a commit graph
    And the developer can push the branch to a remote
    And reviewers can inspect a data diff before merge

  Scenario: Maintainer reviews and merges data
    Given a contributor has opened a DoltHub pull request
    When the maintainer reviews the changed rows and schema
    And discusses the change in the web collaboration surface
    And accepts the pull request
    Then the target branch receives the reviewed data change
    And downstream users can pull the updated database state

  Scenario: Operator investigates historical data
    Given a production issue depends on prior database state
    When the operator queries a table as of a commit or timestamp
    And compares two revisions with diff tooling
    Then the operator can identify changed rows and authorship
    And can revert or merge a corrective change through the same version-control model
