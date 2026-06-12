@competition @ai_agent @persona.github_open_source_contributor
Feature: Research GitHub issue agent
  SWE-agent differentiates by making autonomous GitHub issue fixing inspectable
  through configurable runs and output trajectories.

  Scenario: Contributor runs SWE-agent against a GitHub issue
    Given a GitHub open-source contributor has a repository issue and model credentials
    And the contributor has configured SWE-agent for the repository environment
    When the contributor starts a SWE-agent run for the issue
    Then the agent inspects the repository, edits files, and runs verification commands
    And the run writes trajectory output for later inspection
    When the contributor reviews the proposed patch
    Then the contributor can decide whether the fix is ready for a branch or pull request
    And the project still needs signed provenance to connect the trajectory, patch, tests, and final commit

  Scenario: Researcher compares agent behavior across configurations
    Given a researcher is evaluating software-engineering agents on issue-fixing tasks
    When the researcher runs SWE-agent with different model and tool configurations
    Then each run produces comparable outputs and trajectories
    And benchmark results can be studied alongside the agent's command history
    But governance teams still need normalized evidence that survives outside the experiment directory
