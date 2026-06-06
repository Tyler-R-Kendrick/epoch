@competition @ai_agent @persona.github_open_source_contributor
Feature: Agent manager artifact review
  Google Antigravity differentiates by moving autonomous coding work into an
  agent manager where a contributor supervises tasks and reviews artifacts
  instead of manually driving every editor action.

  Scenario: Contributor reviews artifacts from a concurrent agent session
    Given a contributor opens Google Antigravity for an existing repository
    And the contributor delegates a coding task to a background agent session
    When the agent uses editor, terminal, and browser tools to complete the task
    Then Antigravity reports progress through task state and generated artifacts
    And the contributor reviews the artifact evidence before accepting the work
    And the contributor can decide whether to continue, revise, or reject the agent output
