@competition @persona.github_open_source_contributor
Feature: Design-system prototype in Magic Patterns
  Magic Patterns differentiates by generating customer-testable product prototypes that match an existing design system.

  Scenario: Product manager validates a feature before engineering build
    Given a product manager has a feature idea and an existing product design system
    When the product manager prompts Magic Patterns to generate a prototype flow
    And the team imports or references the design system to match current product styling
    And designers and engineers edit the prototype together in real time
    And the product manager shares a protected preview with customers for feedback
    Then the team can decide whether the feature is worth implementation
    And engineering can use the handoff artifacts as context for the build plan
