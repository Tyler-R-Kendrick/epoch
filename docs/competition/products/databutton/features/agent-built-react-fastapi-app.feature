@competition @ai-app-builder @databutton @react-fastapi-agent
Feature: Agent-built React and FastAPI app
  Databutton plans, builds, edits, deploys, and restores full-stack apps through an AI app developer workflow.

  Background:
    Given a non-technical founder or business team opens Databutton
    And the app can include React frontend code, FastAPI endpoints, secrets, data integrations, checkpoints, and deployment

  Scenario: Planning and building an app with the agent
    Given the user describes the app vision and data needs
    When the Databutton agent creates a plan and starts building
    Then the user can review generated app behavior
    And the user can keep prompting or edit the code directly

  Scenario: Testing an endpoint and storing secrets
    Given the app needs an API key and a backend endpoint
    When the agent creates or updates the endpoint
    Then the user can ask the agent to test the endpoint
    And Databutton can store the API key as a secret for app use

  Scenario: Deploying and restoring the app
    Given the app is ready for users
    When the user deploys the app
    Then Databutton publishes it to a Databutton URL
    And the user can undeploy, restore the last deployed version, or compare checkpoints

  Scenario: Epoch signs AI and human delivery evidence
    Given Databutton has produced plans, code, endpoint tests, secrets, checkpoints, deployments, and optional human expert changes
    When the business accepts the work
    Then Epoch should record the plan, agent prompts, human interventions, file hashes, endpoint test results, secret references, checkpoint diffs, deployment state, and restore points as signed provenance
