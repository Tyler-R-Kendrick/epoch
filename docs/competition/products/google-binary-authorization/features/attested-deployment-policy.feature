@competition @google_binary_authorization @gke @cloud_run @attestations
Feature: Attested deployment policy
  Google Binary Authorization lets platform teams require trusted attestations
  before container workloads deploy to supported Google Cloud runtimes.

  Scenario: Policy requires an attestor
    Given a Binary Authorization policy is configured with REQUIRE_ATTESTATION
    And the policy names one or more required attestors
    When a deployment references a container image
    Then Binary Authorization verifies that required attestations exist
    And the deployment is allowed only when the attestors validate

  Scenario: Build pipeline creates an attestation
    Given a CI pipeline has produced and signed an approved image
    When the pipeline creates an attestation for the image digest
    Then Binary Authorization can use that attestation during deploy-time policy evaluation
    And the policy decision is tied to the immutable image digest

  Scenario: Continuous validation finds drift
    Given continuous validation is enabled for supported workloads
    When a running workload no longer satisfies the configured policy
    Then the platform can surface policy violations after admission
    And operators can investigate runtime drift separately from the original deployment
