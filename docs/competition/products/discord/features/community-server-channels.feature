@competition @discord
Feature: Community servers with independent channels
  Discord organizes conversation into servers (communities) that own channels,
  independent of any source-control repository.

  Scenario: Member switches communities
    Given a user belongs to multiple servers
    When the user selects a different server from the server strip
    Then the channel list swaps to that server's channels
    And the message pane shows the selected channel in the new server

  Scenario: Member chats in a social channel without a repo
    Given a server has a #general channel
    When a member posts a message in #general
    Then the message appears in the channel feed
    And no repository is required to send the message

  Scenario: Member shares a project link inside the community
    Given a #showcase channel
    When a member posts a repository URL
    Then the message may render an embed preview
    And the conversation remains owned by the server channel
