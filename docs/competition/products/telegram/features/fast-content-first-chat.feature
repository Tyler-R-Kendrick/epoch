@competition @telegram
Feature: Fast content-first messaging
  Telegram optimizes for immediate chat with minimal chrome.

  Scenario: User opens a conversation
    Given the user has an existing chat
    When the user selects the chat from the dialog list
    Then messages render as bubbles with avatars
    And the composer is ready for the next message

  Scenario: User sends a message
    Given an open conversation
    When the user sends text
    Then an outgoing bubble appears immediately
    And the chat list preview updates
