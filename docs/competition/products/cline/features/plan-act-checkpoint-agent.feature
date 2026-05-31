@competition @ai_agent @cline @persona.github_open_source_contributor
Feature: Plan, act, and checkpoint an IDE agent task
  Cline lets a developer explore a repository safely, execute an approved implementation, and restore earlier file states when the agent takes a wrong turn.

  Background:
    Given a developer opens Cline in an editor or terminal
    And the repository can be accessed by Cline tools, MCP servers, and approval policies

  Scenario: Planning before changing code
    Given the developer has a complex feature request
    When the developer starts in Plan mode
    Then Cline can read files and search the codebase
    And Cline cannot modify files or run commands
    And the developer receives an implementation approach before execution begins

  Scenario: Acting with explicit tool authority
    Given the developer accepts the plan
    When the developer switches to Act mode
    Then Cline can edit files and run commands with configured approvals
    And Cline can use built-in tools and MCP tools available to the task
    And the developer can inspect the resulting diffs

  Scenario: Restoring a checkpoint after a bad step
    Given Cline has modified files during the task
    When the developer sees an unsuitable change
    Then the developer can compare the checkpoint
    And the developer can restore files, task messages, or both to an earlier point

  Scenario: Epoch preserves checkpointed agent provenance
    Given Cline planned, used tools, requested approvals, ran commands, and created checkpoints
    When the developer accepts the final code
    Then Epoch should record the planning context, tool policies, approvals, checkpoint hashes, command evidence, and final commits as signed provenance
