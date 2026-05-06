@competition @graphite
Feature: GitHub-native stacked pull requests
  Graphite makes dependent changes reviewable as a stack of small pull requests.

  Scenario: Author creates and submits a stack
    Given a GitHub repository initialized with Graphite
    When the author creates multiple dependent branches with the Graphite CLI
    And the author submits the stack
    Then Graphite opens or updates a pull request for each branch
    And the dashboard displays dependency relationships between the pull requests

  Scenario: Author updates an earlier change in the stack
    Given a stack has multiple dependent pull requests
    When the author modifies a downstack branch
    Then Graphite rebases dependent branches
    And the author can resubmit the stack to keep GitHub in sync

