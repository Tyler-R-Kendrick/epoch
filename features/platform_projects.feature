Feature: Epoch platform project separation
  Epoch Platform Web and Epoch Community Web are separate products with separate responsibilities.

  Scenario: Web manages Community as a deployable Epoch app
    Given the Epoch Community API has a repository named "epoch/epoch"
    And the Epoch Community Web app definition
    When I register it with the Epoch Platform Web hosting app
    Then Epoch Platform Web manages the Community app as a deployable service
    And Epoch Platform Web does not expose GitHub-style community workflows
    And Epoch Community Web exposes GitHub-style community workflows from Core

  Scenario: Community owns repository collaboration workflows
    Given a Community repository named "epoch/epoch"
    When a contributor uses Epoch Community Core to open an issue and propose a change
    Then the Community project tracks the issue and proposal
    And the Community project can record a maintainer review

  Scenario: Community CLI uses the Core API client
    Given the Epoch Community API has a repository named "epoch/epoch"
    When I run the Epoch Community CLI to list repositories
    Then the Epoch Community CLI output contains "epoch/epoch"

  Scenario: Community Web renders repository workflows in a browser
    Given the Epoch Community API has a repository named "epoch/epoch"
    When I open Epoch Community Web in a Playwright browser
    Then the Community browser shows repository "epoch/epoch"
    And the Community browser exposes workflow "Issues"
    And the Community browser exposes workflow "Change Reviews"
