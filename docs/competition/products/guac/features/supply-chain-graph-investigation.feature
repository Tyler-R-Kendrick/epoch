@competition @guac @supply_chain_graph @provenance
Feature: Supply-chain graph investigation
  GUAC lets security and platform teams ingest software supply-chain metadata
  and query the resulting graph during audit, policy, and incident workflows.

  Scenario: Security team ingests provenance and SBOM metadata
    Given a team has SBOMs, attestations, vulnerability feeds, and source metadata
    When they load the documents into GUAC collectors and services
    Then GUAC normalizes the entities into a graph
    And the team can query relationships between sources, packages, artifacts, and vulnerabilities

  Scenario: Incident responder checks whether a project is affected
    Given a new vulnerability or compromised source signal is reported
    When an incident responder searches the GUAC graph for related artifacts
    Then they can see transitive dependencies and affected package versions
    And they can identify where attestation or VEX evidence is missing

  Scenario: Developer opens a visual graph from a query result
    Given a CLI query returns a relevant supply-chain relationship
    When the developer opens the result in the GUAC Visualizer
    Then the visualizer focuses the related nodes
    And the developer can expand adjacent relationships to inspect impact
