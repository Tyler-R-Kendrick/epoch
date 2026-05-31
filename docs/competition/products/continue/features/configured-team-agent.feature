@competition @ai_agent @continue @persona.maintainer
Feature: Configured team coding agent
  Continue lets a maintainer run governed AI coding workflows built from reusable models, rules, tools, and agent configurations.

  Background:
    Given a maintainer works in a repository with Continue installed
    And the organization can publish shared agents, rules, models, secrets, and MCP tool blocks

  Scenario: Exploring safely in Plan mode
    Given the maintainer needs to understand an unfamiliar subsystem
    When the maintainer switches Continue to Plan mode
    Then Continue can read files, search the repository, view diffs, and fetch context
    And Continue cannot create files, edit files, delete files, or run terminal commands

  Scenario: Executing with configured tools and permissions
    Given the maintainer has selected a team-approved agent
    When the maintainer switches to Agent mode and requests an implementation
    Then Continue sends the relevant tools to the model
    And Continue requests permission unless a tool policy allows automatic use
    And Continue applies file edits or terminal commands through the configured tool surface

  Scenario: Reusing organization rules and model roles
    Given the organization has published shared rules, models, and MCP tools
    When the maintainer uses the team configuration in the IDE or CLI
    Then Continue applies the selected rules and model roles
    And the maintainer can keep project-specific local rules alongside organization blocks

  Scenario: Epoch preserves configured agent provenance
    Given Continue used a team agent, rules, model roles, secrets, MCP tools, permission decisions, and code edits
    When the maintainer accepts the final change
    Then Epoch should record the active configuration, tool policies, prompts, file hashes, command outputs, and resulting commits as signed provenance
