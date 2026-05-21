@competition @witness @supply_chain_attestation @in_toto
Feature: CI attestation and policy verification
  Witness records CI workflow evidence as attestations and verifies that evidence
  against supply-chain policy before an artifact is trusted.

  Scenario: Build step records provenance evidence
    Given a release pipeline runs a build command
    When Witness wraps the command execution
    Then it records materials, products, environment evidence, and signer data
    And it emits attestations that can travel with the artifact

  Scenario: Release gate verifies policy
    Given a built artifact has Witness attestations
    And the organization defines policy requirements for trusted builds
    When the verifier evaluates the attestations
    Then it accepts artifacts that satisfy policy
    And it rejects artifacts with missing or mismatched evidence

  Scenario: Security team investigates a policy failure
    Given a verification step rejects an artifact
    When the team reviews the failed policy and collected attestations
    Then it can identify which expected material, signer, command, or product was missing
    And it can update the workflow or block the release
