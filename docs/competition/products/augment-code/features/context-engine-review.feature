@competition @ai_agent @persona.maintainer
Feature: Context-rich Augment review loop
  Augment Code differentiates by making repository context a reusable layer for
  coding agents and pull-request review.

  Scenario: Maintainer reviews an AI-generated pull request with repository guidelines
    Given a maintainer has installed Augment Code Review on a GitHub repository
    And the repository includes AGENTS.md, CLAUDE.md, or Augment review guidelines
    When a contributor opens a pull request with agent-authored changes
    Then Augment retrieves related files, call sites, dependency chains, and project rules
    And Augment comments only on issues it can connect to real repository context
    And the maintainer receives a PR summary and inline comments for review
    But the repository still needs durable evidence of which context and guidelines were used

  Scenario: Developer plugs Augment context into another coding agent
    Given a developer prefers to edit with a different MCP-compatible coding agent
    When the developer configures Augment Context Engine MCP
    Then the agent can query semantic repository context while staying in its own UI
    And the developer can keep using the preferred agent while relying on Augment retrieval
