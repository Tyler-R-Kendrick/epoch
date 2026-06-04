@competition @ai_review @persona.security_compliance_responder
Feature: Sentry Seer runtime-grounded fix and review workflow
  Sentry Seer differentiates by grounding AI fixes in runtime telemetry,
  actionability scoring, and pull requests tied back to observed issues.

  Scenario: Compliance responder turns a production issue into a reviewed fix
    Given a security compliance responder sees a Sentry issue with stack traces, spans, logs, commits, and profiling context
    When Seer scans the issue and assigns an actionability score
    Then the responder can inspect Seer's root cause analysis and proposed solution
    When the issue is actionable enough for automation
    Then Seer can generate code changes and open a pull request
    And the pull request carries context from the observed issue for human review
    And the responder can decide whether the fix should be merged or revised

  Scenario: Platform operator configures Seer automation boundaries
    Given a platform operator wants automated issue scans without uncontrolled merges
    When the operator enables Seer scans and configures the minimum score for automated fixes
    Then Seer can triage incoming issues and propose fixes
    And pull request creation remains controlled by project-level settings
