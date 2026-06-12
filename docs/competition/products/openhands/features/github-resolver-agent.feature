@competition @ai_agent @persona.github_open_source_contributor
Feature: GitHub resolver agent
  OpenHands differentiates by turning GitHub issues, labels, comments, and pull
  requests into an open-source agent delegation workflow.

  Scenario: Contributor asks OpenHands to resolve a repository issue
    Given a GitHub open-source contributor has installed the OpenHands GitHub Action
    And the repository has the required model and runtime configuration
    When the contributor adds the `fix-me` label to a well-scoped issue
    Then OpenHands starts an agent run for the issue
    And the contributor can review the resulting pull request rather than copy code from chat
    When the contributor leaves review feedback on the pull request
    Then OpenHands can be invoked again to address the feedback
    And the accepted result remains subject to normal human code review and merge policy

  Scenario: Platform operator deploys OpenHands with private controls
    Given a platform operator needs coding agents to run inside private infrastructure
    When the operator deploys OpenHands Enterprise with self-hosted runtime and BYO model keys
    Then agent work stays within the operator's controlled environment
    And identity, source-control, ticketing, and notification integrations can match the organization's governance model
    But the operator still needs a durable signed record of every prompt, command, policy decision, and code artifact that influenced the final pull request
