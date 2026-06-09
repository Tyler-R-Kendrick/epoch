@competition @product.daytona @persona.platform_operator
Feature: Stateful agent sandbox execution
  Daytona lets a platform operator run AI-generated code in isolated sandboxes with observable resource and activity state.

  Background:
    Given the platform operator has a Daytona organization with API access
    And an AI agent needs to execute code outside the host environment

  Scenario: Run code in an isolated sandbox and preserve state across work
    Given the agent needs dependencies, files, and a running process
    When the operator or agent creates a Daytona sandbox from a snapshot
    Then Daytona launches an isolated environment with allocated CPU, memory, disk, and network state
    When the agent installs packages, edits files, runs commands, and starts a server
    Then the sandbox lifecycle can be stopped, archived, forked, snapshotted, or deleted according to the task outcome

  Scenario: Inspect cost and activity for a sandbox workload
    Given multiple sandboxes are active across the organization
    When the operator opens the Daytona dashboard
    Then the operator can see last activity, resource limits, active sandbox counts, and spending trends
    And high-cost sandboxes can be traced to their resource usage
    And the operator can decide whether to resize, stop, archive, or delete the workload

  Scenario: Automate a GUI workflow inside a sandbox
    Given an agent needs to test a desktop application workflow
    When Computer Use is started in a Linux Daytona sandbox
    Then the agent can inspect displays and accessibility trees
    And the agent can send mouse and keyboard actions
    And the agent can capture screenshots or recordings for review
