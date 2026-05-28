Feature: Epoch.Platform operations
  Epoch.Platform guides operators from first-run setup through safe deploy,
  incident response, AI-assisted actions, and Community governance.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"

  @persona.platform_operator
  Scenario: First-run readiness requires infrastructure, backups, and a deployment
    When I inspect platform first-run readiness
    Then first-run readiness is not production ready
    And first-run readiness includes incomplete step "Connect infrastructure"
    And first-run readiness includes incomplete step "Configure backup destination"
    And first-run readiness includes incomplete step "Deploy first service"
    When I register runner "local-runner" with capacity 2
    And I configure backup destination "s3://epoch-backups"
    And I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    And I inspect platform first-run readiness
    Then first-run readiness is production ready

  @persona.platform_operator
  Scenario: Deploy plans include secrets and impact summary without exposing plaintext
    Given I register runner "local-runner" with capacity 2
    And I add secret reference "DATABASE_URL" with value "postgres://secret" to environment "production"
    When I generate a deploy plan for deployable "api-web" to environment "production"
    Then the deploy plan references secret "DATABASE_URL"
    And the deploy plan does not expose secret value "postgres://secret"
    And the deploy plan impact summary contains "1 deployable"
    And the deploy plan rollback strategy is "previous-successful-deployment"

  @persona.platform_operator
  Scenario: Deploy execution creates runner job, logs, health state, and audit trail
    Given I register runner "local-runner" with capacity 2
    And I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    When I execute the deploy plan
    Then the latest deployment state is "succeeded"
    And the latest deployment health is "healthy"
    And the latest deployment job state is "succeeded"
    And the latest deployment logs contain "Deploy api-web to production"
    And the latest audit event is "deployment.executed"

  @persona.platform_operator
  Scenario: Incident diagnosis and rollback preserve operator context
    Given I register runner "local-runner" with capacity 2
    And I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    And I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    When I mark the latest deployment degraded with reason "health check failed"
    Then the incident diagnosis severity is "high"
    And the incident diagnosis first failing step is "health check failed"
    And the incident diagnosis recommends "Rollback deployment"
    When I roll back the latest deployment as "incident-lead"
    Then the latest deployment state is "rolled_back"
    And the latest audit event is "deployment.rolled_back"

  @persona.platform_operator
  Scenario: AI action plans are scoped, auditable, and approval gated
    Given I register runner "local-runner" with capacity 2
    When I ask AI to "rollback production" for project "platform"
    Then the AI plan action is "rollback production"
    And the AI plan requires approval
    And the AI plan context includes project "platform"
    When I try to execute the AI plan
    Then the platform action fails with code "approval_required"
    When I approve the AI plan as "ops-lead"
    And I execute the AI plan
    Then the latest audit event is "ai.plan.executed"

  @persona.platform_operator
  Scenario: Community publication includes moderation before public visibility
    When I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    Then the Community project public slug is "epoch-platform"
    And the Community project moderation state is "pending_review"
    When I approve the Community project as moderator "mod"
    Then the Community project moderation state is "approved"
    And the latest audit event is "community.project.approved"
