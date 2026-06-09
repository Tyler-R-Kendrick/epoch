@competition @product.gitpod @persona.platform_operator
Feature: Zero-trust development environments
  Gitpod lets a platform operator standardize development environments while keeping code and secrets inside controlled infrastructure.

  Background:
    Given the platform operator manages source repositories that require controlled development environments
    And Gitpod runners are connected to customer controlled infrastructure

  Scenario: Launch a reproducible environment from repository configuration
    Given a project uses Dev Containers and Gitpod Automations
    When a contributor opens the project through Gitpod
    Then Gitpod provisions an environment through the configured runner
    And the environment starts with the expected dependencies and setup tasks
    And the contributor can continue work from a browser IDE, desktop IDE, or local Gitpod Desktop flow

  Scenario: Preserve the security boundary for source code and secrets
    Given a repository contains sensitive source code and project secrets
    When a contributor starts a Gitpod environment
    Then source code and secrets remain inside the customer's infrastructure boundary
    And management-plane activity is authenticated, authorized, and logged
    And the platform operator can use audit records for security investigation
