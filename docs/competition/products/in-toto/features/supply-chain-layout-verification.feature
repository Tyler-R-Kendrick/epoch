@competition @in_toto @supply_chain @attestation
Feature: Supply-chain layout verification
  in-toto lets a project define expected supply-chain steps and verify that
  signed metadata proves those steps were performed by authorized parties.

  Scenario: Project owner defines an expected supply chain
    Given a release process has required source, build, test, and package steps
    When the project owner writes and signs an in-toto layout
    Then the layout names the expected steps and authorized functionaries
    And artifact rules describe how materials and products should flow between steps

  Scenario: Functionary records link metadata
    Given a functionary is authorized to perform a supply-chain step
    When the functionary runs the step with in-toto tooling
    Then link metadata records the command and related artifacts
    And the link metadata is signed by the functionary

  Scenario: Consumer verifies a delivered product
    Given a product ships with a signed layout and required link metadata
    When the consumer runs in-toto verification
    Then the verifier checks signatures, expiration, thresholds, authorized functionaries, and artifact rules
    And the consumer can reject products whose chain of custody does not match the layout
