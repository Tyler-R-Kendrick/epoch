@competition @ai_review @persona.github_open_source_contributor
Feature: Cursor Bugbot pull request review and repair
  Cursor Bugbot differentiates by tying pull request findings directly back
  into the Cursor editor and web-agent repair workflow.

  Scenario: Contributor uses Bugbot to review a pull request
    Given a GitHub open-source contributor opens a pull request in a repository with Bugbot enabled
    When Bugbot runs automatically on the pull request update
    Then it analyzes the diff for bugs, security issues, and code quality problems
    And it posts comments with explanations, fix suggestions, and request identifiers
    When the contributor accepts a finding
    Then the contributor can open the issue through Fix in Cursor or Fix in Web
    And the resulting repair can be reviewed in the same pull request before merge

  Scenario: Maintainer controls review depth and spend
    Given a maintainer wants deeper Bugbot review on a risky pull request
    When the maintainer chooses a higher effort level or triggers a verbose review
    Then Bugbot can spend more work on the review
    And the team can evaluate the resulting findings against the expected usage cost
