@competition @bitbucket @jira @pull_requests
Feature: Jira-connected code review and CI
  Bitbucket connects Git pull requests, Pipelines, Jira context, and merge checks
  so Atlassian teams can move from issue work to governed code delivery.

  Scenario: Developer opens a Jira-linked pull request
    Given a developer works on a branch named with a Jira issue key
    And the repository has Bitbucket Pipelines enabled
    When the developer opens a pull request in Bitbucket
    Then Bitbucket connects the pull request to the Jira work item
    And reviewers can see code, discussion, checks, and issue context together

  Scenario: Premium merge checks enforce team policy
    Given a workspace uses Bitbucket Premium
    And repository administrators require merge checks
    When a pull request lacks required approvals or successful builds
    Then Bitbucket blocks the merge
    And the reviewer sees the policy reason in the pull request workflow

  Scenario: Atlassian Intelligence drafts review context
    Given a pull request contains several commits
    When the author asks Bitbucket to generate a pull request summary
    Then Bitbucket drafts a description from code changes and commit messages
    And the author can edit the summary before requesting review
