@competition @slsa @supply_chain_assurance @provenance
Feature: Source and build assurance levels
  SLSA gives producers and consumers a shared framework for evaluating whether
  source revisions and build artifacts were created through trustworthy processes.

  Scenario: Producer evaluates build provenance requirements
    Given a software producer wants to improve artifact integrity
    When the team compares its build system to the SLSA Build Track
    Then it can identify whether provenance exists
    And it can plan controls for signed provenance and hardened build platforms

  Scenario: Consumer verifies artifact provenance
    Given a consumer has an artifact with provenance metadata
    When the consumer compares the provenance to expected source and build criteria
    Then the consumer can decide whether the artifact meets its SLSA expectations
    And the consumer can reject artifacts whose provenance does not match policy

  Scenario: Repository owner evaluates source revision trust
    Given a repository owner wants stronger assurance about source changes
    When the owner reviews SLSA Source Track guidance
    Then the owner can define the expected process for creating revisions
    And consumers can later inspect attestations about that source process
