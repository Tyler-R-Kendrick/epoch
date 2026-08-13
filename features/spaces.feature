Feature: Shared signed workspaces
  A Space is the object a second person can join: one View of history, a
  workspace on each participant's machine, the conversation that drove the work,
  and every participant holding a grant that says what they may do.

  @persona.github_open_source_contributor
  Scenario: Contributor joins a shared space and gets to work
    Given a maintainer has opened a space called "Nightboard redesign" over the main view
    When the contributor joins the space as a collaborator
    And the contributor records a turn asking for the rail to be narrowed
    Then the turn is recorded against the contributor's own grant
    And the space shows the contributor among its active participants

  @persona.maintainer
  Scenario: Maintainer removes a participant and their access ends with them
    Given a maintainer has opened a space called "Release triage" over the main view
    And a contributor has joined the space and recorded a turn
    When the maintainer removes the contributor from the space
    Then the contributor can no longer record a turn in the space
    And the space no longer counts the contributor as an active participant

  @persona.security_compliance_responder
  Scenario: Responder confirms an agent cannot outspend its allocated budget
    Given a maintainer has opened a space called "Agent triage" over the main view
    And a member agent has joined the space with a budget of 3 units
    When the agent records a turn costing 2 units
    Then the agent has 1 unit remaining
    And a further turn costing 2 units is refused as over budget

  @persona.security_compliance_responder
  Scenario: Responder confirms continuous capture requires recorded consent
    Given a maintainer has opened a space called "Capture review" over the main view
    When an agent tries to record captured edits before any consent is given
    Then the capture is refused because no capture session is open
    When the maintainer opens a capture session scoped to "packages/Epoch.Community.Web" retained for "30d"
    Then the agent's captured edit is recorded against that session
    And closing the session seals it with the number of operations it captured

  @persona.platform_operator
  Scenario: Operator sees a workspace report only what its provider declared
    Given a maintainer has opened a space called "Provider audit" over the main view
    When the operator binds a filesystem workspace to the space
    Then the bound workspace reports execution as disabled
    And binding a workspace that claims isolated execution is refused

  @persona.github_open_source_contributor
  Scenario: A review comment survives the file being reformatted
    Given a maintainer has opened a space called "Anchor review" over the main view
    And the contributor has anchored a comment to the "rail" setting in a board configuration
    When the configuration is reformatted and its settings are reordered
    Then the comment still points at the "rail" setting
    But the comment reports itself unresolved once the "rail" setting is deleted

  @persona.security_compliance_responder
  Scenario: Responder confirms an agent turn ran inside a proven boundary
    Given a maintainer has opened a space called "Sandboxed work" over the main view
    And an agent has joined the space
    When the agent runs a command in the space through a sandbox
    Then the turn records the isolation the sandbox actually proved
    And a signed receipt reports the outcome and the network posture

  @persona.security_compliance_responder
  Scenario: Responder sees an unprovable sandbox refused rather than trusted
    Given a maintainer has opened a space called "Isolation required" over the main view
    And an agent has joined the space
    When the agent demands isolation from a sandbox that cannot prove it
    Then the run is refused because the sandbox cannot prove isolation
    And the refusal is recorded as a receipt so the denied attempt leaves evidence

  @persona.github_open_source_contributor
  Scenario: Contributor joins a space and pays for content only where they look
    Given a maintainer has opened a space called "Big tree" over the main view
    And the space describes a board configuration and a readme
    When the contributor opens the space without materializing it
    Then every path is described while its bytes stay virtual
    And reading the board configuration materializes only that file

  @persona.maintainer
  Scenario: Maintainer joins a space synced from another machine
    Given a maintainer has opened a space called "Cross machine" over the main view
    When a teammate on another replica syncs the space from that machine
    Then the teammate can join the synced space
    And the teammate's replica verifies the space history offline
