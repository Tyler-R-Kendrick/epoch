@competition @cursor @ai_editor @agent_checkpoints @code_review
Feature: Agentic editor changes with checkpoints
  Cursor lets developers request repository changes from an editor-native
  Agent, review generated edits, restore local checkpoints, and send related
  issues through PR review or background agents.

  Scenario: Developer asks Agent to implement a multi-file change
    Given a repository is open in Cursor
    And project rules or AGENTS.md instructions are available to the Agent
    When the developer prompts Agent to implement a feature
    Then Agent can search the codebase, edit multiple files, and run commands
    And Cursor creates a local checkpoint for the Agent-made changes

  Scenario: Developer rejects a poor Agent trajectory
    Given Agent changed files in a way that breaks expected behavior
    When the developer restores the checkpoint from the prior prompt
    Then Cursor rolls back the Agent-made changes tracked by that checkpoint
    But manual edits and durable Git history remain outside the checkpoint model

  Scenario: Team routes review feedback back into Cursor
    Given Bugbot comments on a pull request with a potential bug
    When the developer opens the fix link in Cursor or the web agent surface
    Then the review finding becomes an actionable coding task
    And repository-specific Bugbot rules can provide review context
