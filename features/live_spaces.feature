Feature: Live Spaces
  A Live Space is a signed live session bound to an existing Space: one View
  selects what an audience may see, publication is a fail-closed allow-list,
  spectators verify and replay released state in their own view, and the work
  a session produces continues as normal signed Epoch history.

  @persona.maintainer
  Scenario: Maintainer runs a semantic-only live session end to end
    Given a maintainer has opened a space called "Nightboard live" for a live session
    And the maintainer has created a live session bound to that space
    When the maintainer records consent for semantic capture
    And the maintainer opens the lobby and starts the session
    And the maintainer pauses and later resumes publication
    And the maintainer ends the session
    Then the maintainer seals the session into a replay marked "semantic-only"
    And every lifecycle step is a signed event that verifies offline
    And the sealed session refuses any further change

  @persona.security_compliance_responder
  Scenario: Responder proves nested secrets never enter the presentation stream
    Given a live session is publishing from an allow-listed application path
    When the host's tooling emits an action whose nested arguments carry an API key
    Then the secret-bearing action is dropped as an immutable denial
    And the released stream contains only the allow-listed action
    And no released envelope or quarantine record contains the secret value

  @persona.security_compliance_responder
  Scenario: Responder confirms a custom rule cannot re-enable a denied path
    Given a live session is publishing from an allow-listed application path
    When the host tries to publish an action that touches an environment secrets file
    Then the publication is dropped as an immutable denial
    And the denial holds even though the session allow-lists every path

  @persona.github_open_source_contributor
  Scenario: Contributor observes, requests access, annotates, and forks an exact checkpoint
    Given a live session is publishing from an allow-listed application path
    When the contributor joins the session as an observer
    Then the contributor cannot publish into the session
    When the contributor requests publish capability
    Then the request is recorded but grants nothing
    When the host records a presentation checkpoint
    And the contributor annotates that checkpoint on the board file
    And the contributor forks the session at that checkpoint
    Then the fork records provenance back to the session and checkpoint

  @persona.maintainer
  Scenario: Maintainer grants a temporary collaborator and revocation ends the access
    Given a live session is publishing from an allow-listed application path
    And the host has granted a contributor temporary collaborator capability
    When the contributor publishes an allow-listed action
    Then the contributor's action is released into the stream
    When the host revokes the contributor's grant
    Then the contributor's next publication attempt is refused

  @persona.github_open_source_contributor
  Scenario: Spectator recovers missed events and converges from a checkpoint
    Given a live session has released a sequence of presentation envelopes
    When a spectator receives the envelopes out of order with a duplicate
    Then the spectator reports the gap, converges in order, and ignores the duplicate
    When a late joiner resynchronizes from the checkpoint plus later envelopes
    Then both spectators agree on the same last sequence
    And the host's theme preference is never replayed into a spectator's view

  @persona.platform_operator
  Scenario: Operator sees media capability labels that match reality
    Given the live media provider is disabled
    Then media readiness reports itself provider-disabled while the semantic session still works
    And starting public synchronized audio without live captions is refused
    And an end-to-end-encrypted session refuses provider recording and egress
