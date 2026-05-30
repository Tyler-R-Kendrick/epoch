@competition @ai-agent @jetbrains-junie @ide-native-agent
Feature: IDE-native coding agent workflow
  JetBrains Junie lets developers delegate repository work from a JetBrains IDE or Junie CLI while retaining review and rollback controls.

  Background:
    Given a developer works in a JetBrains IDE project
    And the repository can include AGENTS.md guidelines and .aiignore boundaries

  Scenario: Planning and approving a multi-file IDE task
    Given the developer opens Junie from the AI tool window
    When the developer requests a multi-step code change
    Then Junie plans the work against project context
    And Junie requests approval before sensitive commands or file operations by default
    And the developer reviews changed files in the IDE before accepting the result

  Scenario: Rolling back an unsuitable agent change
    Given Junie has modified multiple project files
    When the developer decides the result is not suitable
    Then the developer can roll back selected files
    Or the developer can roll back to an earlier checkpoint in the conversation

  Scenario: Running Junie outside the IDE
    Given the developer installs Junie CLI
    When the developer starts an agent task from the terminal or a forge workflow
    Then Junie can continue the same agentic coding model across CLI, GitHub, or GitLab surfaces

  Scenario: Epoch preserves IDE agent provenance
    Given Junie has planned, edited, executed commands, and rolled back or accepted changes
    When the accepted work becomes a commit
    Then Epoch should record the prompt, guidelines, approvals, tool boundaries, file hashes, rollback points, command evidence, and resulting commits as signed provenance
