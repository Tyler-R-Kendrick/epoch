@competition @codesandbox @sandbox @ai_agent @persona.github_open_source_contributor
Feature: Programmable AI sandbox lifecycle
  CodeSandbox differentiates by exposing isolated development environments
  through an SDK that can be used by AI products and developer tools.

  Scenario: Contributor evaluates an agent change in an isolated sandbox
    Given a GitHub open-source contributor maintains a repository with runnable tests
    And a developer tool has access to CodeSandbox SDK credentials
    When the tool creates a sandbox for an agent task
    Then the agent can run code inside an isolated environment
    And the tool can fork the sandbox to compare alternate fixes
    When the candidate fix is ready for review
    Then the sandbox can expose a live preview and preserve state through snapshots
    And the contributor can resume, inspect, or discard the sandbox before accepting changes
