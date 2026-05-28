Feature: Epoch.Platform infrastructure and delivery
  Epoch.Platform must connect infrastructure, discover deployables, coordinate
  runners, preserve plan-first delivery, and validate configuration safely.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    And I register runner "local-runner" with capacity 2

  @persona.platform_operator
  Scenario: Infrastructure targets, resources, templates, and deployable discovery are inspectable
    When I connect infrastructure target "prod-cluster" kind "kubernetes" in region "us-central"
    And I provision resource "postgres" kind "database" provider "postgres" in environment "production"
    And I discover deployable "api-service" from repository "api" manifest "epoch.deploy.yml" with runtime "node"
    And I create template "node-api" for deployable kind "app"
    Then infrastructure target "prod-cluster" health is "healthy"
    And project "platform" overview lists resource "postgres"
    And discovered deployable "api-service" has runtime "node"
    And template "node-api" is available

  @persona.platform_operator
  Scenario: Dry-run deploy plans are deterministic, editable, cancelable, and promotable
    Given I create protected environment "staging" in project "platform"
    And I open API request "req-2" with idempotency key "release-1"
    When I generate a dry-run deploy plan for deployable "api-web" to environment "production"
    And I edit deploy plan runtime variable "PORT" to "3000"
    Then the deploy plan is dry run
    And the deploy plan generated configuration includes "PORT=3000"
    When I cancel the deploy plan as "ops-lead"
    Then the deploy plan state is "canceled"
    When I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    And I promote the latest deployment to environment "staging"
    Then the latest promotion state is "succeeded"
    And the latest audit event is "deployment.promoted"

  @persona.platform_operator
  Scenario: Runner coordination handles heartbeats, quarantine, retries, and reconciliation
    When I schedule platform job "index-search" with idempotency key "job-1"
    And runner "local-runner" sends heartbeat
    And I quarantine runner "local-runner" for reason "checksum mismatch"
    And I retry platform job "index-search"
    Then runner "local-runner" state is "quarantined"
    And platform job "index-search" attempt is 2
    And platform job "index-search" logs contain "retry scheduled"
    When I reconcile runner loss for job "index-search"
    Then platform job "index-search" state is "reconciled"

  @persona.platform_operator
  Scenario: Platform configuration accepts forward-compatible unknown sections but rejects invalid known sections
    When I load platform configuration with unknown section "future"
    Then platform configuration warnings include "future"
    When I try to load invalid platform configuration section "database"
    Then the platform action fails with code "invalid_configuration"
    And the platform action suggests "Fix database configuration"
