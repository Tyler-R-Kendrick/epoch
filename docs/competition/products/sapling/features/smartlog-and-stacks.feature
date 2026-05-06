@competition @sapling
Feature: Smartlog-centered source control
  Sapling makes repository state visible through a concise smartlog.

  Scenario: User creates a stack without explicit branch setup
    Given a user has cloned a repository
    When the user creates several commits
    Then Sapling displays the current stack with the current checkout marked
    And the user can navigate with top, bottom, next, and previous commands

  Scenario: User manipulates commits in Interactive Smartlog
    Given the user starts Sapling Web
    When the user drags a commit in the interactive smartlog
    Then Sapling rebases the commit and its dependent stack
    And the UI keeps repository state visible without requiring commit hashes

