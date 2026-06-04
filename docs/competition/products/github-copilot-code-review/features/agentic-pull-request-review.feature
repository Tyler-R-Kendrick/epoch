@competition @ai_review @persona.maintainer
Feature: GitHub Copilot agentic pull request review
  GitHub Copilot Code Review differentiates by making AI review a native
  GitHub pull request workflow with repository policy and billing controls.

  Scenario: Maintainer requests a Copilot review from a pull request
    Given a maintainer opens a pull request in a repository with Copilot Code Review enabled
    When the maintainer requests Copilot as a reviewer
    Then Copilot gathers diff and repository context through GitHub's agentic review infrastructure
    And it posts structured pull request feedback in the same review surface as human reviewers
    And the maintainer can resolve, discuss, or apply suggestions before merge
    And the organization can account for the run through AI Credits and GitHub Actions minutes

  Scenario: Organization enables automatic review for protected repositories
    Given a platform operator wants every pull request reviewed before merge
    When automatic Copilot review is enabled for selected repositories
    Then eligible pull requests receive AI review without each author manually assigning Copilot
    And branch protection and human approval remain available as separate merge controls
