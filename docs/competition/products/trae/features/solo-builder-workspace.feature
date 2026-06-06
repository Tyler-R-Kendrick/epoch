@competition @ai_agent @persona.github_open_source_contributor
Feature: SOLO builder workspace
  Trae differentiates by giving a contributor a visual agent workspace where
  planning, code generation, preview, and deployment-oriented tools sit in one
  product mode.

  Scenario: Contributor turns a product idea into a previewable implementation
    Given a contributor opens Trae in SOLO mode
    And the contributor selects SOLO Builder for a new web application idea
    When the contributor describes the desired product behavior in natural language
    Then Trae analyzes the requirement and drafts a structured plan
    And Trae generates code while showing task progress, editor state, and preview context
    And the contributor reviews the previewable result before deciding whether to continue, revise, or ship
