@competition @ai_agent @persona.maintainer
Feature: Context-aware AI code review
  Bito differentiates by reviewing pull requests with repository context,
  custom rules, Jira alignment, analytics, and coding-agent handoff.

  Scenario: Maintainer tunes an AI review agent for a repository
    Given a maintainer has connected a repository to Bito's AI Code Review Agent
    And the team has custom review guidance in Bito or repository instruction files
    When a contributor opens a pull request
    Then Bito reviews the diff with codebase context and posts findings in the pull request
    And Bito can include summaries, changelists, security findings, and rule-specific suggestions
    When the maintainer marks a suggestion as unhelpful
    Then Bito can learn a review rule to reduce similar future noise
    And the team can inspect review analytics to understand coverage, issue categories, and skipped reviews

  Scenario: Coding agent runs Bito review before applying fixes
    Given a developer uses an AI coding agent with Bito review instructions configured
    When the developer asks the coding agent to review local changes
    Then the coding agent runs the Bito review command
    And the developer can ask the coding agent to implement selected fixes
    But the accepted fixes still need signed provenance tying the review, guidance, and final diff together
