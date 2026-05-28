Feature: Epoch Community Operations extension
  Community Operations is a separate deployable app for project-owned hosting, workflows, and agent sandboxes.

  Scenario: Community maintainer operates project capabilities from a separate extension
    Given an Epoch Platform project with repository-hosted code, runner, workflow run, and agent sandbox
    When I open the Epoch Community Operations extension in a Playwright browser
    Then the Community Operations browser shows hosted app "dashboard-web"
    And the Community Operations browser shows repository source "epoch-community"
    And the Community Operations browser shows runtime "node20"
    And the Community Operations browser shows workflow "GitHub Actions CI"
    And the Community Operations browser shows agent sandbox "ui-agent"
    And the Community Operations browser shows sandbox output patch "patch-region-widget"
    And the Community Operations browser shows runner "runner-a"
    And the Community Operations browser shows signed provenance "event-agent-sandbox"
    And the Community Operations browser exposes action "Promote"
    And the Community Operations browser exposes action "Rollback"
    And the Community Operations browser presents a visually validated operations dashboard

  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for community_operations.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec                          | persona      | pain point                                  | human consideration | journey                                                               |
        | features/community_operations.feature | A maintainer | Reducing Maintainer And Contributor Burnout | auditability        | operate community-owned hosting, workflows, and agent sandbox evidence |
