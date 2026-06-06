@competition @ai_agent @persona.github_open_source_contributor
Feature: Mode-scoped coding agent workflow
  Roo Code differentiated by letting a contributor choose role-specific modes
  with distinct tool permissions, model assignments, and project-scoped MCP
  extensions before allowing an agent to edit files or run commands.

  Scenario: Contributor delegates a repository task to an orchestrated mode
    Given a contributor has Roo Code installed in VS Code
    And the repository defines project-scoped modes and MCP configuration
    When the contributor selects an Orchestrator mode for a complex change
    Then Roo Code breaks the work into role-specific tasks
    And each mode uses only its configured tools, model, and instructions
    And the contributor can review checkpoints before accepting file changes
