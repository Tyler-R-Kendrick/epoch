@optimizexp @ux @persona:forge-community-power-user @interface:web @interface:cli @persona-role:platform
Feature: Safe reusable Nightboard actions for a forge power user
  As a forge and terminal power user
  I want to compose existing Nightboard commands into a named action
  So that repeated review navigation takes one deterministic command

  Scenario: Forge power user operates every focused-post action by keyboard
    Given I open `http://127.0.0.1:8787/` and focus a post in a Nightboard channel
    Then its action row offers vote, react, fold, reply, repost, share, and copy
    When I use the disclosed single-key shortcut for each action
    Then each shortcut produces the same result as its adjacent action control
    And focus or reply context remains on the post I acted on

  Scenario: Forge power user defines and runs a safe reusable macro
    Given I open `http://127.0.0.1:8787/` and enter Nightboard
    When I run `macro set review = cd /projects/epoch/changes; view state:needs-review`
    Then the transcript says macro review was saved
    And `macro list` shows review and its two existing Nightboard commands
    When I run `macro run review`
    Then Nightboard navigates to `/projects/epoch/changes` and applies `state:needs-review`
    And the macro remains after reloading the page

  Scenario: Forge power user gets an actionable refusal for an unsafe macro
    Given I am using the Nightboard prompt
    When I run `macro set deploy = javascript:alert(1)`
    Then the transcript rejects the unknown command
    And no script is evaluated or saved

  Scenario: Forge power user expands and restores the focused panel
    Given I focus a Nightboard navigation, thread, session, or editor panel
    When I press the disclosed expand hotkey
    Then that focused panel fills the workspace without changing its selection
    When I press the hotkey again
    Then the prior panel layout and focus context are restored
