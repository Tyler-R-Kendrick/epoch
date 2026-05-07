Feature: Epoch.Platform foundation
  Epoch.Platform.Core owns platform invariants while Epoch.Platform.Sdk exposes
  headless management flows for operators and agents.

  Scenario: Headless project setup keeps Community optional
    Given an Epoch Platform instance with Community disabled
    When I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    Then the platform capability "community" is disabled
    And the project "platform" overview lists repository "api"
    And the project "platform" overview has empty-state action "Create deployable"

  Scenario: Deploy plans expose impact before execution
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    When I generate a deploy plan for deployable "api-web" to environment "production"
    Then the deploy plan targets environment "production"
    And the deploy plan source repository is "api"
    And the deploy plan requires approval "protected-environment"
    And the deploy plan primary action is "Deploy to production"
    And the deploy plan SDK operation is "deployments.executePlan"

  Scenario: Protected deploy execution records audit trail after approval
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    And I generate a deploy plan for deployable "api-web" to environment "production"
    When I try to execute the deploy plan
    Then the platform action fails with code "policy_denied"
    And the platform action suggests "Approve deploy plan"
    When I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    Then the latest deployment state is "succeeded"
    And the latest audit event is "deployment.executed"

  Scenario: Community can be enabled without coupling core deployability
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    When I try to publish project "platform" to Community as "epoch-platform"
    Then the platform action fails with code "feature_disabled"
    When I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    Then the platform capability "community" is enabled
    And the Community project public slug is "epoch-platform"
