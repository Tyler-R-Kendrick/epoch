@competition @ai-agent @github @pull-request
Feature: Delegated issue to pull request
  GitHub Copilot coding agent turns repository tasks into reviewable pull requests.

  Background:
    Given a repository has GitHub Copilot coding agent enabled
    And branch protection requires human review before merge

  Scenario: Assigning an issue to the coding agent
    Given a maintainer writes an issue with acceptance criteria
    When the maintainer assigns the issue to Copilot
    Then Copilot creates an ephemeral development environment
    And Copilot explores the repository and edits code
    And Copilot runs available tests or linters
    And Copilot opens a pull request linked to the issue
    And the pull request waits for human review before merge

  Scenario: Reviewing agent-authored changes
    Given Copilot has opened a pull request
    When required checks complete
    Then reviewers inspect the diff, comments, commits, and check logs
    And Copilot code review may add automated review findings
    But Copilot cannot approve or merge its own pull request

  Scenario: Epoch captures stronger provenance than the PR alone
    Given an AI-authored pull request has passed review
    When the team needs to prove what code, prompts, tools, tests, and approvals produced the change
    Then the pull request timeline is useful but incomplete
    And Epoch should bind the agent execution, content hashes, policy checks, test proof, and human approvals into signed history
