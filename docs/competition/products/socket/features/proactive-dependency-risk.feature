@competition @socket @dependency_security @supply_chain
Feature: Proactive dependency risk checks
  Socket analyzes dependency changes and package behavior so teams can block or
  review risky packages before they are merged into a repository.

  Scenario: Pull request adds a risky dependency
    Given a repository has the Socket GitHub App installed
    When a pull request adds a new dependency to a manifest file
    Then Socket analyzes the package for supply-chain, quality, maintenance, vulnerability, and license risks
    And the pull request receives feedback before the dependency is merged

  Scenario: Organization blocks severe alerts
    Given an organization has configured Socket alert policies
    When a dependency triggers a block-level alert
    Then the Socket check fails the pull request
    And contributors must remediate or explicitly ignore the alert

  Scenario: Security team reduces CVE noise
    Given a package has a known vulnerability
    When Socket evaluates reachability for the application
    Then the team can prioritize vulnerabilities that are more likely to execute
    And irrelevant alerts can be reduced before they become routine noise
