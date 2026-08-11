@optimizexp @ax @persona:agentic-coding-power-user @interface:web @interface:mcp @persona-role:agent-operator
Feature: One Nightboard action contract for agents and voice
  As an agentic coding power user
  I want my named action exposed through the existing WebMCP and voice routes
  So that automation does not drift from the action I tested manually

  Background:
    Given persona "agentic-coding-power-user" is active
    And feature "community-web-power-controls" is under optimizexp review

  Scenario: Agentic coding power user invokes the same macro as a tool and exact voice phrase
    Given `macro set review = cd /projects/epoch/changes; view state:needs-review` is saved
    And `macro voice review = start review` is saved
    When I inspect the page WebMCP registry
    Then it lists `user_review` with the saved action description
    When the agent calls `user_review` or voice command mode hears `start review`
    Then both invoke `macro run review`

  Scenario: Agentic coding power user avoids accidental voice activation
    Given the saved voice phrase is exactly `start review`
    When voice command mode hears `start reviewing`
    Then it reports an unknown voice command
    And `user_review` is not invoked
