@competition @ona @cloud_development_environment @ai_agent @persona.platform_operator
Feature: Governed background agent environments
  Ona differentiates by turning standardized development environments into
  controlled execution space for background software agents.

  Scenario: Platform operator launches a governed agent from a repository issue
    Given a platform operator has connected source control and an issue tracker to Ona
    And the repository defines its development environment with Dev Containers and automations
    When the operator assigns an implementation issue to a background agent
    Then Ona starts an isolated environment from the project configuration
    And the agent can run commands, edit files, and use repository instructions
    And the organization can enforce guardrails and audit the agent execution
    When the agent completes the task
    Then the operator can review the resulting branch or pull request
    And the team retains environment, policy, and execution records for the work
