@competition @ratify @supply_chain @kubernetes @attestations
Feature: Artifact admission verification
  Ratify verifies artifact signatures and attestations before Kubernetes admits
  workloads that reference those artifacts.

  Scenario: Unsigned image is denied
    Given a cluster has Ratify installed with Gatekeeper admission enforcement
    And the active Ratify policy requires a valid signature for matching images
    When a workload references an unsigned image
    Then the admission request is denied
    And the denial explains that the subject failed verification

  Scenario: Signed image passes verifier policy
    Given a platform team has configured a Notation verifier and trust policy
    When a workload references an image signed by a trusted identity
    Then Ratify resolves the signature artifact from the registry
    And the admission controller can allow the workload

  Scenario: SBOM or provenance evidence becomes part of admission policy
    Given an image has attached SBOM or provenance attestations
    When Ratify evaluates the image against artifact verification policies
    Then configured verifiers validate the attached evidence
    And the final policy decision can require more than a raw image signature
