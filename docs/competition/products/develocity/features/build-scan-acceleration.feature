@competition @develocity @build_scan @remote_cache @test_selection
Feature: Build scan acceleration and diagnosis
  Develocity records build and test evidence, accelerates deterministic work,
  and explains failures so platform teams can improve delivery speed without
  losing visibility into what happened.

  Scenario: Developer shares a Build Scan for troubleshooting
    Given a build fails on a developer machine
    When the developer publishes a Build Scan link
    Then teammates can inspect tasks, dependencies, environment data, and timeline evidence
    And they can compare the failing build with a successful build

  Scenario: Build engineer diagnoses a cache miss
    Given two builds were expected to reuse the same task outputs
    When the build engineer compares task inputs in Develocity
    Then changed inputs and dependency differences are visible
    And the team can fix the configuration that prevented reuse

  Scenario: CI uses predictive test selection
    Given Develocity has observed prior code changes and test outcomes
    When a pull request build runs with Predictive Test Selection
    Then only tests predicted to provide useful feedback are selected
    And the Build Scan reports which tests were selected, which were skipped, and estimated time savings
