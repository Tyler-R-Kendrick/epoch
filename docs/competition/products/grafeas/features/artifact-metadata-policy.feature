@competition @grafeas @artifact_metadata @supply_chain_governance
Feature: Artifact metadata and deploy policy
  Grafeas stores supply-chain metadata about artifacts so tools can query facts
  and enforce policy before deployment.

  Scenario: Scanner records vulnerability metadata
    Given a container image is scanned
    When the scanner writes vulnerability occurrences to a Grafeas-compatible store
    Then platform teams can query known findings for that artifact
    And incident responders can find affected images by vulnerability or package

  Scenario: Build system records provenance metadata
    Given a CI system builds an artifact
    When the build system records build and attestation occurrences
    Then downstream tools can inspect how the artifact was produced
    And policy engines can require expected provenance before deployment

  Scenario: Admission control checks artifact metadata
    Given a deployment requests an artifact
    When a policy controller checks its metadata and attestations
    Then it allows artifacts that satisfy the deployment policy
    And it blocks artifacts with missing or disallowed metadata
