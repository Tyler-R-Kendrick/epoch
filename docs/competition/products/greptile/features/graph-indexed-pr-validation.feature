@competition @ai_review @persona.security_compliance_responder
Feature: Greptile graph-indexed pull request validation
  Greptile differentiates by reviewing pull requests with whole-codebase graph
  context and by handing findings to AI coding agents for resolution.

  Scenario: Security responder validates an AI-authored pull request before merge
    Given a security compliance responder is responsible for reviewing AI-authored code changes
    And Greptile has indexed the repository and loaded custom review rules
    When a pull request is opened or updated
    Then Greptile reviews the diff against repository graph context, custom rules, and team standards
    And it posts a summary, inline findings, and suggested fixes in the pull request
    And the pull request can expose a status check for review completion
    When the responder accepts a finding
    Then the issue context can be sent to a coding agent such as Codex, Claude Code, Cursor, or Devin
    And the responder can re-run review until critical issues are resolved

  Scenario: Maintainer tunes Greptile for repository-specific standards
    Given a maintainer wants fewer noisy review comments
    When the maintainer commits a `greptile.json` file with scoped rules, strictness, paths, and trigger settings
    Then Greptile applies repository-specific review behavior from the source branch
    And future reviews reflect the team's preferred standards and review cadence
