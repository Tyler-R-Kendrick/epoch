@competition @forgejo @federation @self_hosted_forge
Feature: Community-governed self-hosted forge with federation direction
  Forgejo gives communities a familiar Git forge under open governance
  so they can operate code collaboration without depending on a commercial host.

  Scenario: Organization self-hosts a lightweight forge
    Given an administrator wants a community-governed Git forge
    When the administrator deploys Forgejo on their own infrastructure
    Then users can create repositories, issues, pull requests, wikis, and packages
    And the organization controls the service and its data

  Scenario: Developer uses Actions inside Forgejo
    Given a repository contains workflows under .forgejo/workflows
    And repository Actions are enabled
    When a developer pushes a commit
    Then Forgejo creates a workflow run
    And the developer can inspect status, logs, and failures from the Actions tab

  Scenario: Community evaluates federation readiness
    Given a public Forgejo instance wants cross-instance collaboration
    When maintainers review Forgejo federation guidance
    Then they see that federation is experimental
    And they must account for missing moderation, access-control, and compatibility guarantees
