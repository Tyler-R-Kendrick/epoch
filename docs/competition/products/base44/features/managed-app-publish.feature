@competition @base44 @ai_app_builder @persona.github_open_source_contributor
Feature: Managed AI app publish with recoverable ownership signals
  A GitHub open-source contributor wants to turn an internal workflow idea into a usable app
  without losing track of what the platform owns and what the repository can recover.

  Scenario: Build, connect, publish, and verify a generated business app
    Given the contributor starts in the Base44 builder with a workflow prompt
    And the app needs user accounts, a database, and a third-party OAuth connector
    When the contributor asks Base44 to generate the app
    And connects the required external service through the integration settings
    And publishes the app for a small team
    Then the team can use the generated app from a hosted URL
    And the contributor can inspect the app's generated resources and connector state
    And the contributor can decide whether GitHub sync is enough ownership for the workflow
    And production changes remain risky if platform-owned backend behavior changes without a repository-visible diff
