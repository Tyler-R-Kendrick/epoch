@competition @ai-agent @kiro @spec-driven-agent
Feature: Spec-driven agent workflow
  Kiro turns product intent into requirements, design, tasks, and agent-executed code changes.

  Background:
    Given a developer opens a project in Kiro
    And the project may contain steering files, hooks, and MCP server configuration

  Scenario: Moving from prompt to implementation plan
    Given the developer describes a feature in natural language
    When Kiro creates a spec
    Then the developer can review requirements and acceptance criteria
    And Kiro can propose architecture and implementation tasks before writing code

  Scenario: Executing a spec task
    Given a reviewed spec contains sequenced tasks
    When the developer starts a task
    Then Kiro uses agentic execution to edit code
    And Kiro shows task progress, changed files, execution details, and completion state

  Scenario: Delegating parallel context gathering
    Given the task requires information from several parts of the repository
    When Kiro launches subagents
    Then each subagent gathers context in its own window
    And the main agent waits for the results before continuing

  Scenario: Epoch signs spec-to-commit evidence
    Given Kiro has transformed intent into specs, tasks, hooks, and code changes
    When the developer accepts and commits the result
    Then Epoch should record the requirements, design, task execution, hook activity, subagent summaries, file hashes, command outputs, and commits as signed provenance
