Feature: Community native channels
  Native channels are signed gossip events. Transport moves bytes; clients verify.

  @persona.github_open_source_contributor
  Scenario: Two contributors exchange signed channel messages
    Given a signed community channel named general
    When Maya posts a signed channel message "ship the posture badge"
    And Jules posts a signed channel message "looks good"
    Then both clients project the same conversation
    And forged channel messages are rejected

  @persona.github_open_source_contributor
  Scenario: Live composer does not use local-only signatures
    Given a live community channel session
    When Maya composes a live channel message "queue rule holds"
    Then the live signature is not local-only

  @persona.github_open_source_contributor
  Scenario: Public channel messages fan out over XMPP without treating MUC as identity
    Given a signed community channel named general
    And an enabled XMPP s2s bridge to a.example
    When Maya posts a signed channel message "ship the posture badge"
    Then the peer receives the same signed channel bytes over XMPP
    And a MUC occupant JID cannot author the message

  @persona.platform_operator
  Scenario: Open posture keeps a local unread watermark
    Given an open-posture community
    When a channel.read event arrives
    Then unread stays on the local watermark
