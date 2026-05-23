@competition @kyverno @kubernetes @policy @supply_chain
Feature: Image verification policy
  Kyverno verifies container image references, signatures, digests, and
  attestations through Kubernetes-native admission policies.

  Scenario: Policy mutates image tag to digest
    Given a Kyverno verifyImages rule has mutateDigest enabled
    When a workload uses a matching image tag
    Then Kyverno resolves the immutable image digest
    And the admitted workload references the verified digest

  Scenario: Unsigned image is blocked
    Given a ClusterPolicy requires matching images to be signed
    When a user creates a pod using an unsigned image
    Then Kyverno denies the admission request
    And the user must publish a trusted signature or use an approved exception

  Scenario: Signed attestation is checked
    Given a policy includes an attestation condition
    When a matching image has a signed attestation attached in the registry
    Then Kyverno verifies the attestation signature
    And Kyverno evaluates the predicate data before allowing the workload
