@competition @github
Feature: GitHub repository collaboration
  GitHub centralizes source hosting, review, automation, and project memory.

  Scenario: Contributor opens a pull request against a hosted repository
    Given a contributor has pushed a branch to GitHub
    When the contributor opens a pull request
    Then reviewers can inspect the diff, comment inline, request changes, and see CI status
    And the repository keeps issues, branches, pull requests, Actions, releases, and packages in one hosted surface

  Scenario: Non-developer tries to download a project artifact
    Given a visitor lands on a repository page
    When the desired output is a binary release rather than source code
    Then the visitor must distinguish the Code button, releases, assets, tags, and README instructions
    And this creates a poor experience when maintainers have not made the distribution path obvious

