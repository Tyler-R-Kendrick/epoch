@competition @ai-agent @google-ai-studio-build @firebase
Feature: Google full-stack AI Studio build flow
  Google AI Studio Build turns a prompt into a Firebase-backed app and can hand deeper work to Antigravity-style agents.

  Background:
    Given a builder is signed into Google's developer ecosystem
    And the builder wants to create a full-stack app from a prompt

  Scenario: Generating an app blueprint and preview
    Given the builder enters a natural-language app prompt
    When Google AI Studio or Firebase Studio proposes a blueprint
    Then the builder can review app name, features, and style direction
    And the builder can generate a Next.js app and interact with the preview

  Scenario: Publishing with Firebase services
    Given the generated app needs persistence, authentication, and hosting
    When the builder asks the agent to add Firebase services and clicks Publish
    Then Google can provision a Firebase project, connect billing when required, deploy to App Hosting, and show app overview metrics

  Scenario: Epoch signs cloud-backed agent changes
    Given Google's agent has created code, cloud resources, API keys, rules, indexes, and deployment state
    When a team accepts the app as an auditable release
    Then Epoch should record the prompt, blueprint, generated code, cloud resources, billing-affecting approvals, rules, tests, rollout, and agent handoff as signed provenance
