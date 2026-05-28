Feature: Epoch Community Operations extension
  Community Operations is a separate deployable app for project-owned hosting, workflows, and agent sandboxes.

  @persona.maintainer
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
