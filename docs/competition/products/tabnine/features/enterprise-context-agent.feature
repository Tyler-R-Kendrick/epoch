@competition @ai_agent @persona.maintainer
Feature: Enterprise context agent workflow
  Tabnine differentiates by making private organizational context available to
  IDE and CLI agents across controlled deployment environments.

  Scenario: Maintainer uses remote organizational context during an agent task
    Given a maintainer works in an enterprise repository connected to Tabnine
    And an administrator has enabled Context Engine tools for the team
    When the maintainer asks Tabnine Agent to refactor a service using remote repository context
    Then Tabnine can search connected repositories, files, and generated context layers
    And the agent proposes a plan before applying project changes
    When the maintainer approves the plan and reviews the resulting diff
    Then the maintainer can accept code that follows organizational patterns
    But the team still needs durable signed evidence of which context assets influenced the accepted change

  Scenario: Developer runs a terminal code review before opening a pull request
    Given a developer has Tabnine CLI authenticated for the workspace
    When the developer asks Tabnine CLI to review recent changes for security and maintainability
    Then the CLI reads the relevant files and reports actionable findings
    And the developer can ask follow-up questions or request fixes before creating a pull request
