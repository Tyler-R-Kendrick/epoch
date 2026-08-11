@optimizexp @ux @ax @persona:app-builder-design-power-user @interface:web @interface:docs @persona-role:design
Feature: Deterministic HoBo authoring for an app builder
  As a design-led app builder
  I want Bo to use checked templates and docs instead of guessing application code
  So that I can build, test, debug, preview, and deploy a HoBo app reproducibly

  Scenario: App builder uses Bo's deterministic HoBo template and trainable fallback
    Given I open Nightboard and inspect `/.agents/bo`
    Then Bo's instructions require generated HoBo docs and offline templates
    And its tools expose `new`, `build`, `test`, `debug`, and `up` through one deterministic workbench
    When requested logic is outside the selected model's declared capability
    Then Bo emits a contract-backed `use training` stub instead of guessed implementation code

  Scenario: App builder gets an actionable refusal instead of a guessed HoBo command
    Given I open Nightboard and inspect `/.agents/bo`
    When I request an unknown template or run `up` without a checked plan
    Then the HoBo workbench refuses the request without changing the project
    And it recommends a supported template or the exact `up --plan` command
