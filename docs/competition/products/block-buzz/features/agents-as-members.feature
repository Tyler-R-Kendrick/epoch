@competitor @block-buzz @ai-native
Feature: Agents as first-class channel members
  As a Buzz power user
  I want agents to join channels as members with their own identities
  So that multi-agent work leaves a shared, auditable room history

  Scenario: Invite an agent like a person
    Given a community workspace with human members
    When I add an agent to a channel the same way I add a human
    Then the agent appears in the member surface with its own identity
    And the agent is not presented only as a slash-command bot

  Scenario: Agent posts with scoped membership
    Given an agent is a member of channel "#engineering"
    When the agent posts progress and artifacts in that channel
    Then humans can read the post in the same stream as human messages
    And the agent action is attributable to the agent identity

  Scenario: Harness swap keeps room history
    Given an agent has contributed to a channel under one harness
    When the operator swaps the agent harness (e.g. Goose to Claude Code)
    Then prior channel history remains searchable
    And the agent identity does not silently become a different person without notice
