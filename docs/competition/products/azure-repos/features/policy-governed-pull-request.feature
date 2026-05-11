@competition @azure-repos
Feature: Azure Repos policy-governed pull request
  Azure Repos differentiates through branch and repository policies that bind review, work tracking, build validation, and merge strategy.

  Scenario: Team protects a main branch with policy requirements
    Given a repository administrator opens branch policies for the main branch
    When the administrator requires reviewers, linked work items, resolved comments, build validation, status checks, and a limited merge strategy
    Then direct pushes to the protected branch are rejected unless a user has bypass permission
    And pull requests show policy status before completion

  Scenario: Pull request is blocked by path-specific governance
    Given a pull request changes files under a guarded path
    When the branch policy automatically includes required reviewers for that path
    Then the pull request cannot complete until the configured reviewer rule is satisfied
    And the policy explains the missing approval as part of the merge readiness flow

  Scenario: Governance creates contributor friction
    Given a contributor sees multiple optional and required policy failures
    When the failures involve work item links, comment resolution, build validation, and reviewer rules
    Then the contributor must understand both repository policy and project process
    And the flow becomes harder to use than a simple signed local review record

