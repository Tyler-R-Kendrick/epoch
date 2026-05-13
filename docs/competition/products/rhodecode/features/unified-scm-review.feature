@competition @rhodecode @enterprise_scm @code_review
Feature: Unified SCM review
  RhodeCode lets enterprise teams manage Git, Mercurial, and Subversion
  repositories through one governed code review and permissions surface.

  Scenario: Administrator grants access through repository groups
    Given an organization has repositories grouped by product area
    When an administrator assigns a user group to a repository group
    Then the users inherit repository permissions from the group
    And repository ownership and access can be adjusted without moving the repository

  Scenario: Developer opens a pull request for review
    Given a developer has completed work on a branch or fork
    When they open a pull request in RhodeCode
    Then reviewers can leave inline comments and set review status
    And RhodeCode can merge automatically when approvals and merge safety checks are satisfied

  Scenario: Team enables AI review on selected pull requests
    Given AI review has been configured for the instance
    When a pull request author enables AI code review
    Then RhodeCode records the AI review status in audit logs
    And the pull request receives automated review feedback inside the governed review workflow
