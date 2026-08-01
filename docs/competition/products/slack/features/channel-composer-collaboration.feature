@competition @slack
Feature: Channel-first workplace messaging
  Slack organizes work into channels with a sticky composer and threaded replies.

  Scenario: Member opens a project channel
    Given a workspace with a public channel named ideas
    When a member selects #ideas from the channel rail
    Then the message pane shows that channel's history
    And the composer is labeled for #ideas

  Scenario: Member posts a message
    Given a member is viewing #ideas
    When the member submits text in the composer
    Then the message appears in the channel feed
    And other members can react or reply in thread
