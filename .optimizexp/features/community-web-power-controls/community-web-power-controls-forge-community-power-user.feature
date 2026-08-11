@optimizexp @ux @persona:forge-community-power-user @interface:web @interface:cli @persona-role:platform
Feature: Safe reusable Nightboard actions for a forge power user
  As a forge and terminal power user
  I want to compose existing Nightboard commands into a named action
  So that repeated review navigation takes one deterministic command

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
