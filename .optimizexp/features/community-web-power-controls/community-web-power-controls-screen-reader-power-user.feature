@optimizexp @ux @persona:screen-reader-power-user @interface:web @persona-role:end-user
Feature: Keyboard-operable Nightboard messages for a screen-reader power user
  As a screen-reader power user
  I want the message feed to expose one clear selection and focus target
  So that I can scan and open conversations without a pointer

  Background:
    Given persona "screen-reader-power-user" is active
    And feature "community-web-power-controls" is under optimizexp review

  Scenario: Screen-reader power user traverses messages with one roving tab stop
    Given I open `http://127.0.0.1:8787/` and enter a Nightboard text channel
    When I Tab to the selected message and press ArrowDown
    Then the next message is the only message with tabindex 0
    And its accessible selection and visible focus identify the same post
    When I press Enter
    Then that post opens as the current thread

  Scenario: Screen-reader power user recovers from the end of a message list
    Given focus is on the last message in a Nightboard channel
    When I press ArrowDown
    Then focus remains on the last message without scrolling the page unexpectedly
    And pressing ArrowUp moves to the previous message
