@competition @phorge @phabricator_lineage @review_audit
Feature: Differential review and audit
  Phorge lets teams review proposed changes before publication and audit
  published commits after the fact through connected workflow objects.

  Scenario: Developer submits a pre-push Differential revision
    Given a developer has prepared a local change
    When they submit the diff for Differential review
    Then reviewers receive a revision with inline commenting and review actions
    And the author can update the revision until it is accepted

  Scenario: Owner rules request post-publish audit
    Given a commit changes code owned by a package
    And the commit did not receive the required owner involvement before publication
    When audit rules evaluate the commit
    Then Phorge creates an audit request for the appropriate owner or project
    And the auditor can accept the commit or raise a concern

  Scenario: Herald explains automation results
    Given an administrator has configured Herald rules for revisions and commits
    When a matching object is created or updated
    Then Phorge applies rule actions such as adding reviewers, subscribers, or audits
    And users can inspect transcripts or dry-run rules to understand why actions occurred
