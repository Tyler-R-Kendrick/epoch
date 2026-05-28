Feature: Epoch.Platform AI, operations, and HA/DR
  Epoch.Platform must make AI contextual and auditable while exposing
  operator dashboards, support bundles, backup, restore, and failover drills.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    And I register runner "local-runner" with capacity 2
    And I configure backup destination "s3://epoch-backups"
    And I add secret reference "DATABASE_URL" with value "postgres://prod" to environment "production"

  @persona.platform_operator
  Scenario: AI context packs redact secrets, cite sources, and gate unsafe tools
    When I create AI context pack for actor "admin" scoped to project "platform" with sources "logs,checks,secrets"
    Then AI context does not contain secret value "postgres://prod"
    And AI context cites source "logs"
    And AI context cites source "checks"
    When I request AI tool "deploy.execute" for project "platform"
    Then AI tool request "deploy.execute" requires approval
    When I try AI tool "secret.reveal" for project "platform"
    Then the platform action fails with code "policy_denied"
    And the platform action suggests "Use secret reference"
    When I record AI evaluation "secret-redaction" with score 1
    Then AI evaluation "secret-redaction" passes

  @persona.platform_operator
  Scenario: Deployment failure diagnosis preserves logs, classifies failure, and creates follow-up work
    Given I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    When I mark the latest deployment failed with class "runner unavailable"
    Then failure classification is "runner_unavailable"
    And recovery action includes "retry when runner healthy"
    When I acknowledge the incident as "responder"
    And I create follow-up issue "Fix health checks" from the incident
    Then issue "Fix health checks" exists
    And the latest audit event is "incident.follow_up_issue.created"

  @persona.platform_operator
  Scenario: Operator dashboard and support bundle expose production readiness without leaking secrets
    When I generate operator dashboard
    Then operator dashboard service health is "healthy"
    And operator dashboard backup freshness is "configured"
    And operator dashboard runner capacity is 2
    When I generate support bundle
    Then support bundle includes "feature capability map"
    And support bundle includes "runner diagnostics"
    And support bundle redacts secret value "postgres://prod"

  @persona.platform_operator
  Scenario: Backup, restore, failover, and RPO/RTO drills are coordinated
    When I start backup "nightly"
    And I verify backup "nightly"
    Then backup "nightly" verification status is "verified"
    When I run restore dry run for backup "nightly"
    Then restore dry run status is "passed"
    When I declare HA profile "Enterprise HA" with RPO "5 minutes" and RTO "30 minutes"
    And I run failover drill "region outage"
    Then failover drill "region outage" status is "passed"
    And documented RPO is "5 minutes"
    And documented RTO is "30 minutes"
