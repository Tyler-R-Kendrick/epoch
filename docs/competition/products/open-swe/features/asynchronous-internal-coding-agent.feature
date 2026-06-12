@competition @ai_agent @persona.platform_operator
Feature: Asynchronous internal coding agent
  Open SWE differentiates by giving platform teams an open framework for
  internal coding agents that plan, execute, review, and open pull requests.

  Scenario: Platform operator routes a GitHub issue to an internal coding agent
    Given a platform operator has deployed Open SWE with GitHub repository access
    And the operator has configured the model, sandbox, and workflow integrations
    When a contributor delegates a GitHub issue to Open SWE
    Then Open SWE creates or updates a tracking issue with run status
    And it researches the codebase and proposes an execution plan
    When the contributor accepts or edits the plan
    Then the agent writes code, runs tests, reviews its work, and opens a pull request
    And maintainers can review the pull request in their normal GitHub flow

  Scenario: Contributor redirects a running agent with new product context
    Given a contributor is watching an active Open SWE task
    When the contributor notices that the plan missed a product constraint
    Then the contributor can send additional instructions without restarting the run
    And the agent can incorporate that context into the active task
    But the team still needs a signed record of the old plan, new instruction, changed commands, and final evidence
