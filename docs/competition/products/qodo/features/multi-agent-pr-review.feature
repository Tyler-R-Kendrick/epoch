@competition @ai_agent @persona.maintainer
Feature: Multi-agent Qodo pull-request review
  Qodo differentiates by placing multi-agent review and rule enforcement inside
  the existing Git pull-request workflow.

  Scenario: Maintainer receives context-aware Qodo review
    Given a maintainer has Qodo v2 enabled for a repository
    And the repository has review rules and Git integration configured
    When a contributor opens a pull request with AI-generated code
    Then Qodo runs multi-agent review with codebase and pull-request context
    And Qodo posts focused findings, summaries, and rule-related feedback in the pull request
    When the maintainer resolves or accepts the findings
    Then the pull request can proceed with clearer review evidence
    But the final repository history still needs to preserve which review evidence was trusted

  Scenario: Team migrates from Qodo Merge to Qodo v2
    Given a team previously used Qodo Merge or PR-Agent commands
    When the team adopts the Qodo v2 Git integration
    Then review capabilities move into the unified Qodo code-review experience
    And maintainers need to confirm which old commands and configuration files still apply
