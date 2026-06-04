@competition @ai_review @persona.github_open_source_contributor
Feature: Ellipsis GitHub teammate review and fix workflow
  Ellipsis differentiates by staying inside GitHub pull request
  conversations while learning reviewer preferences and generating fixes.

  Scenario: Open-source contributor gets a quiet first AI review
    Given a GitHub open-source contributor opens a pull request in a repository with Ellipsis installed
    And the project has style-guide rules and quiet-mode preferences configured
    When Ellipsis reviews the pull request
    Then it posts only findings that pass the configured confidence threshold
    And it flags logical errors, anti-patterns, style-guide violations, security issues, or documentation drift
    When the contributor reacts to or replies to a review comment
    Then Ellipsis can learn which comments the project values for future reviews

  Scenario: Maintainer asks Ellipsis to fix a review finding
    Given a maintainer accepts an Ellipsis review finding
    When the maintainer tags Ellipsis and asks for a fix
    Then Ellipsis works in a container with the repository context
    And it can compile, test, and return a pull request or explicit commit for human review
    And it does not merge code without maintainer approval
