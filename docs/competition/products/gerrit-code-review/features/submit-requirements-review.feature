@competition @gerrit-code-review
Feature: Gerrit submit requirements review
  Gerrit differentiates by treating review and submit readiness as explicit change metadata.

  Scenario: Developer uploads a change for review
    Given a developer has committed a local Git change
    When the developer pushes the commit to a Gerrit review ref
    Then Gerrit creates a change with a patch set
    And reviewers can inspect diffs, leave inline comments, and vote on configured labels

  Scenario: Submit requirements block unsafe landing
    Given a project requires a maximum Code-Review vote from a non-uploader and a passing Verified label
    When the change is missing one of those requirements
    Then Gerrit marks the submit requirement as unsatisfied
    And the change cannot land until the requirement expression evaluates as satisfied or overridden

  Scenario: Specialized workflow slows a newcomer
    Given a contributor expects a GitHub-style branch and pull request workflow
    When they encounter patch sets, label votes, attention sets, and submit expressions
    Then they need project-specific training before they can safely interpret merge readiness
    And review integrity comes at the cost of onboarding simplicity

