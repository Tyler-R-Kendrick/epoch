@competition @ai-agent @devin @autonomous-engineering
Feature: Autonomous engineering session
  Devin accepts engineering tasks, works in a hosted environment, and returns reviewable repository changes.

  Background:
    Given a team has connected Devin to GitHub
    And Devin has an environment blueprint for the repository

  Scenario: Delegating a feature or bug fix
    Given a user describes an engineering task
    When Devin starts a session
    Then Devin clones or opens the configured repository
    And Devin uses its editor, terminal, and browser to inspect and change the system
    And Devin runs relevant validation commands when available
    And Devin creates a GitHub pull request for human review

  Scenario: Responding to review feedback
    Given Devin has opened a pull request
    And a reviewer leaves requested changes
    When Devin receives the PR comment
    Then Devin updates the branch or explains the blocker
    And the reviewer can continue the normal GitHub review flow

  Scenario: Triggering Devin from operational events
    Given an automation listens for a GitHub CI failure
    When a matching check fails
    Then Devin starts a session with the failed PR context
    And Devin inspects the logs
    And Devin proposes or pushes a fix according to the configured workflow

  Scenario: Epoch records durable agent evidence
    Given Devin has completed a task in a hosted environment
    When the team needs long-term accountability
    Then Epoch should preserve the prompts, environment digest, tool actions, diffs, tests, PR review events, and approvals as signed history
