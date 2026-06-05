@competition @anything_create @ai_app_builder @persona.github_open_source_contributor
Feature: Prompt-to-published app with generated verification
  A GitHub open-source contributor wants to publish a generated app and know which parts were actually tested.

  Scenario: Build, test, export, and publish an app from natural language
    Given the contributor describes a full-stack app with pages, auth, database records, and an AI integration
    And the builder has enough credits to generate, test, and publish the project
    When Anything generates the app and shows the preview
    And the contributor uses the available testing or visual QA flow before publishing
    And exports the code or publishes the hosted app
    Then the app is available from a shareable published surface
    And the contributor can inspect the project structure and credit usage
    And the contributor still needs clear evidence of which generated tests passed and which user flows remain unverified
