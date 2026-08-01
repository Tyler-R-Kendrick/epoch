Feature: Epoch Identity Bridge v2
  Mutual Nostr↔ATProto bindings preserve Ed25519 as root and verify client-side.

  @persona.security_compliance_responder
  Scenario: Valid mutual binding verifies without trusting the index
    Given a Nostr key and AT DID controlled by the same Epoch author
    When the owner completes the binding ceremony with affirmative confirmation
    Then pure verifyBinding returns valid
    And the witness index stores the full proof bundle

  @persona.security_compliance_responder
  Scenario: Rollback after revocation is rejected
    Given a valid binding that was later revoked at the next seqno
    When an attacker re-presents the pre-revocation pair against a pinned head
    Then verifyBinding fails with chain-regression

  @persona.security_compliance_responder
  Scenario: Mix-and-match plane proofs fail closed
    Given a Nostr binding event for pair A and an AT record for pair B
    When verifyBinding runs
    Then the result is invalid with mismatch-fields

  @persona.security_compliance_responder
  Scenario: Agent attestation is scoped expiring and rate-limited
    Given an owner→agent 30423 attestation with limited scope
    When the agent exceeds the request policy window
    Then further requests are denied without touching rotation keys

  @persona.security_compliance_responder
  Scenario: Protocol-shaped AT proof rejects tampering
    Given a signed protocol AT proof for a mutual binding
    When the proof slice is tampered
    Then verifyBinding fails closed with proof-invalid
