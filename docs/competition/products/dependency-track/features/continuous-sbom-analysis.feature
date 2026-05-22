@competition @dependency_track @sbom @vulnerability_management
Feature: Continuous SBOM analysis
  Dependency-Track lets organizations upload SBOMs and continuously evaluate
  component, vulnerability, policy, and portfolio risk across software projects.

  Scenario: Project owner uploads a new SBOM
    Given a project version has a generated CycloneDX SBOM
    When the SBOM is uploaded to Dependency-Track
    Then the platform identifies components for the project
    And it evaluates known vulnerabilities and inherited risk

  Scenario: Security team enforces portfolio policy
    Given an organization has defined component and vulnerability policies
    When a new SBOM is processed for a project
    Then Dependency-Track evaluates matching policy conditions
    And the team can review policy violations across the project portfolio

  Scenario: Operations team routes new risk
    Given notification rules are configured for portfolio events
    When a new vulnerability or policy violation is identified
    Then Dependency-Track can publish an alert to an integration
    And responders can triage the affected project and component
