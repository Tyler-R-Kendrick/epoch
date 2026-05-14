Feature: Object storage data branching
  lakeFS differentiates by giving object-storage data lakes Git-like branches, commits, merges, rollback, hooks, and protected promotion.
  The implementation is strong when data engineers need isolated tests against production-scale data without copying terabytes.
  The implementation is weaker when users expect simple spreadsheet-like collaboration or do not control the surrounding storage and pipeline stack.

  Background:
    Given a data platform stores production datasets in object storage
    And the team needs to test changes before exposing them to consumers

  Scenario: Engineer validates a pipeline on an isolated branch
    Given the engineer creates a branch from the production repository
    When the engineer writes transformed objects to the branch
    And runs validation through pipeline tooling
    Then the production branch remains unchanged
    And the team can inspect the branch as a versioned data snapshot

  Scenario: Maintainer promotes data with quality gates
    Given a branch contains a candidate data update
    And the target branch is protected by pre-merge hooks
    When the maintainer requests a merge into production
    Then lakeFS runs the configured data checks
    And only atomically promotes the data if the hooks pass

  Scenario: Operator rolls back bad production data
    Given bad data has been merged into a production branch
    When the operator identifies a prior known-good commit
    And performs a rollback or revert
    Then consumers can return to the previous data state
    And the repository history preserves the corrective operation
