@competition @sigstore @artifact_provenance @keyless_signing
Feature: Keyless artifact signing
  Sigstore lets a maintainer sign and verify software artifacts using identity-backed
  short-lived certificates and transparency-log evidence instead of long-lived keys.

  Scenario: Maintainer signs a release artifact from CI
    Given a build workflow has produced an artifact
    And the workflow can authenticate with an OIDC identity
    When the workflow signs the artifact with Cosign
    Then Fulcio issues a short-lived signing certificate for that identity
    And Rekor records transparency-log evidence for the signature
    And the artifact can be distributed with verifiable signing metadata

  Scenario: Consumer verifies artifact identity and inclusion
    Given a consumer has an artifact and Sigstore verification metadata
    When the consumer verifies the artifact with Cosign
    Then the signature matches the artifact digest
    And the certificate identity matches the expected publisher
    And the transparency-log proof shows the signing event was recorded

  Scenario: Organization evaluates private signing needs
    Given an organization cannot publish all metadata to a public transparency log
    When the platform team reviews Sigstore deployment options
    Then they can compare public-good defaults, private deployment, and offline verification trade-offs
    And they can document which evidence must be preserved for auditors
