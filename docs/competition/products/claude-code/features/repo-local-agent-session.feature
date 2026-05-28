@competition @ai-agent @claude-code @local-agent
Feature: Repository-local agent session
  Claude Code lets developers delegate repository work from terminal, desktop, IDE, or GitHub Actions.

  Background:
    Given a repository contains project instructions for the coding agent
    And the developer has configured allowed tools and review expectations

  Scenario: Running a local terminal agent session
    Given a developer opens Claude Code in a repository
    When the developer asks for a behavior change
    Then Claude Code reads relevant files
    And Claude Code proposes or performs edits
    And Claude Code runs commands when approved or configured
    And the developer reviews the resulting diff before commit

  Scenario: Managing parallel desktop sessions
    Given a developer has multiple tasks in flight
    When the developer starts isolated desktop sessions
    Then each task can keep separate context and Git state
    And the developer can inspect terminals, editors, previews, and visual diffs before accepting changes

  Scenario: Triggering Claude from GitHub
    Given Claude Code GitHub Actions is installed
    When a reviewer mentions Claude on an issue or pull request
    Then Claude can analyze the repository context
    And Claude can implement changes or open a pull request according to workflow policy

  Scenario: Epoch preserves local agent accountability
    Given Claude Code has edited files and run local commands
    When the developer commits accepted work
    Then Epoch should record the agent session, inputs, file hashes, command evidence, approvals, and resulting commits as signed provenance
