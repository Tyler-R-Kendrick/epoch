@optimizexp @ux @dx @persona:github-power-user @interface:web
Feature: Deterministic search and user projections for a GitHub power user
  As a GitHub power user
  I want one deterministic search and namespace workbench
  So that I can find and organize review work without trusting hidden automation

  Background:
    Given persona "github-power-user" is active
    And feature "community-web-search-projections" is under optimizexp review

  Scenario: GitHub power user searches registered sources and saves the result
    Given Nightboard is open with current and stale authorized sources
    When I press Ctrl+F and run `state:needs-review`
    Then the Query workbench shows the canonical query and explicit source completeness
    And Explain identifies the visible fields that matched
    And I can preview and save the exact query as a projection without an AI call

  Scenario: GitHub power user corrects an invalid query without losing input
    Given the Query workbench contains `updatedAt:=>tomorrow`
    When I run the query
    Then the diagnostic names the invalid operator and exact source span
    And focus returns to the preserved query beside a suggested correction
