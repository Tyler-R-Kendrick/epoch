@optimizexp @ax @persona:agentic-coding-power-user @interface:web @interface:mcp @persona-role:agent-operator
Feature: One Community Web action contract for agents and voice
  As an agentic coding power user
  I want my named action exposed through the existing WebMCP and voice routes
  So that automation does not drift from the action I tested manually

  Scenario: Agentic coding power user invokes the same macro as a tool and exact voice phrase
    Given I open `http://127.0.0.1:8787/` and enter Community Web
    And `macro set review = cd /projects/epoch/changes; view state:needs-review` is saved
    And `macro voice review = start review` is saved
    When I inspect the page WebMCP registry
    Then it lists `user_review` with the saved action description
    When the agent calls `user_review` or voice command mode hears `start review`
    Then both invoke `macro run review`

  Scenario: Agentic coding power user avoids accidental voice activation
    Given I open Community Web with the review action already saved
    And the saved voice phrase is exactly `start review`
    When voice command mode hears `start reviewing`
    Then it reports an unknown voice command
    And `user_review` is not invoked

  Scenario: Agentic coding power user consumes compatible startup conditions with one restart
    Given Community Web detects a resumable Codex session, an available update, and unprimed workspace defaults
    Then the bottom line recommends `Ctrl+U` and names all compatible changes
    When I press `Ctrl+U` outside the file editor
    Then Community Web applies the update and workspace defaults before continuing the session
    And the bottom line recommends the next available action

  Scenario: Agentic coding power user keeps one cache-sticky route per workspace
    Given the current workspace route policy prefers an on-device model with a capable fallback
    When I run several agent turns in that workspace
    Then every turn uses the same selected route
    When that route reports a recoverable failure or the policy version changes
    Then the next turn selects and persists one fallback route
