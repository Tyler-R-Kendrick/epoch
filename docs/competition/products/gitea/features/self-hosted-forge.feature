@competition @gitea @self_hosted_forge @actions
Feature: Self-hosted Git forge with integrated Actions and packages
  Gitea gives small teams a familiar Git forge, CI, package registry, and project workflow
  so they can keep development infrastructure under their own control.

  Scenario: Team creates a repository and reviews a pull request
    Given an administrator runs a Gitea instance for an organization
    And a developer has repository write access
    When the developer pushes a branch and opens a pull request
    Then reviewers can inspect commits, diffs, checks, and discussion in the repository UI
    And maintainers can merge according to repository permissions

  Scenario: Workflow runs through Gitea Actions
    Given a repository contains a workflow under .gitea/workflows
    And an Actions runner is registered with the instance
    When a commit triggers the workflow
    Then Gitea records the run in the Actions tab
    And the developer can inspect job status and logs from the forge

  Scenario: Package artifacts stay close to source
    Given a team publishes package artifacts from its build
    When artifacts are uploaded to the Gitea package registry
    Then package versions remain associated with the same user or organization
    And the team can manage access without adding a separate artifact platform
