@competition @coder @cloud_development_environment @self_hosted @persona.platform_operator
Feature: Template-governed development workspace
  Coder differentiates by letting platform teams provision controlled
  development workspaces from infrastructure-as-code templates.

  Scenario: Platform operator publishes a reusable workspace template
    Given a platform operator manages a self-hosted Coder deployment
    And the team needs repeatable environments for developers and coding agents
    When the operator creates a Terraform-backed template with approved tools and resources
    Then developers can create workspaces from that template
    And each workspace inherits the approved infrastructure, IDE options, and policy constraints
    When workspaces become idle or expensive
    Then Coder can apply scheduling, autostop, and usage visibility
    And auditors can inspect how users interacted with workspaces and templates
