@competition @windsurf @cascade @agent_workflows @checkpoints
Feature: Cascade workflow with agent checkpoints
  Windsurf lets developers drive repository work through Cascade, reusable
  markdown workflows, memories, tool calls, checkpoints, and preview deploys.

  Scenario: Developer invokes a reusable workflow
    Given a repository contains a `.windsurf/workflows/run-tests-and-fix.md` workflow
    When the developer invokes the workflow from Cascade with a slash command
    Then Cascade follows the workflow steps as a trajectory-level instruction
    And the workflow can be shared through repository history

  Scenario: Developer recovers from a bad Cascade edit
    Given Cascade changed files during a Code mode task
    When the developer reverts to a named checkpoint
    Then Windsurf returns the project to the selected checkpoint state
    But the revert is irreversible and separate from durable version history

  Scenario: Developer deploys a preview from Cascade
    Given a supported JavaScript web app is open in Windsurf
    When Cascade runs an App Deploys tool call
    Then Windsurf can publish a preview URL through Netlify
    And the user can claim or redeploy the preview project
