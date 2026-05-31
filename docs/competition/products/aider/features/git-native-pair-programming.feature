@competition @ai_agent @aider @persona.github_open_source_contributor
Feature: Git-native terminal pair programming
  Aider lets a developer delegate repository changes from a terminal while keeping each AI edit reviewable through Git.

  Background:
    Given a developer works in a local Git repository
    And the developer has configured a cloud or local model for Aider

  Scenario: Editing a focused working set with repository context
    Given the developer starts Aider with the files they expect to change
    When the developer asks for a feature or bug fix
    Then Aider uses the selected files and repository map as coding context
    And Aider applies diffs to the working tree
    And the developer can inspect the changed files before continuing

  Scenario: Repairing code with lint and test feedback
    Given Aider has edited source files
    When the developer runs a lint or test command from the Aider chat
    Then Aider receives the failing output
    And Aider can revise the code until the command passes

  Scenario: Undoing an unsuitable AI change
    Given Aider committed an AI-authored change
    When the developer decides the change is unsuitable
    Then the developer can use Aider undo or normal Git history to remove the change
    And the developer keeps the repository under familiar Git control

  Scenario: Epoch preserves terminal agent provenance
    Given Aider used prompts, repo-map context, conventions, diffs, lint output, tests, and Git commits
    When the developer accepts the final commit
    Then Epoch should record the prompt, context boundaries, model/provider, command outputs, file hashes, and resulting commit as signed provenance
