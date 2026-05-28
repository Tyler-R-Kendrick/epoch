Feature: Epoch.Platform product domains
  Epoch.Platform combines enterprise identity, forge collaboration, package
  distribution, search, observability, Community social features, and snapshot
  portability.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    And I register runner "local-runner" with capacity 2

  @persona.maintainer
  Scenario: Environment approvals are governed by RBAC
    Given I create platform user "alice"
    And I create platform user "bob"
    And I create platform team "release-managers" in organization "acme"
    And I add user "bob" to team "release-managers"
    And I grant team "release-managers" role "environment-approver" on environment "production"
    And I generate a deploy plan for deployable "api-web" to environment "production"
    When I try to approve the deploy plan as "alice"
    Then the platform action fails with code "permission_denied"
    And the platform action suggests "Ask an environment approver"
    When I approve the deploy plan as "bob"
    Then the deploy plan approval is recorded for "bob"
    And the latest audit event is "deployment.plan.approved"

  @persona.maintainer
  Scenario: Issues, intents, checks, and reviews form a forge workflow
    Given I create issue "Ship API" in project "platform"
    When I create review intent "Add API endpoint" for repository "api" linked to issue "Ship API"
    And I record check "ci" with status "passed" on the review intent
    And I ask AI to summarize the review intent
    And I approve the review intent as "maintainer"
    And I merge the review intent
    Then the review intent state is "merged"
    And the review intent check "ci" is "passed"
    And the review intent AI summary contains "Add API endpoint"
    And issue "Ship API" is linked to the review intent
    And the latest audit event is "review_intent.merged"

  @persona.maintainer
  Scenario: Packages, search, and observability connect platform surfaces
    Given I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    When I publish package "api-web" version "1.0.0" from the latest deployment
    Then package "api-web" version "1.0.0" is available
    When I search the platform for "api"
    Then search results include repository "api"
    And search results include deployable "api-web"
    And search results include package "api-web"
    When I inspect observability summary
    Then observability runner count is 1
    And observability latest deployment state is "succeeded"

  @persona.maintainer
  Scenario: Community profiles, follows, stars, discussions, reports, and feeds work together
    Given I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    And I approve the Community project as moderator "mod"
    When I create public profile "alice"
    And public profile "alice" follows Community project "epoch-platform"
    And public profile "alice" stars Community project "epoch-platform"
    And public profile "alice" opens discussion "Roadmap" on Community project "epoch-platform"
    Then the Community project "epoch-platform" has 1 follower
    And the Community project "epoch-platform" has 1 star
    And the Community feed includes "alice opened discussion Roadmap"
    When I report discussion "Roadmap" for reason "spam"
    Then the Community moderation queue contains discussion "Roadmap"
    When moderator "mod" resolves report for discussion "Roadmap"
    Then the Community moderation queue is empty
    And the latest audit event is "community.report.resolved"

  @persona.maintainer
  Scenario: Platform snapshots restore core and community state
    Given I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    And I approve the Community project as moderator "mod"
    And I generate a deploy plan for deployable "api-web" to environment "production"
    And I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    When I export a platform snapshot
    And I restore the platform snapshot into a fresh SDK
    Then the platform capability "community" is enabled
    And the project "platform" overview lists repository "api"
    And the Community project public slug is "epoch-platform"
    And the latest deployment state is "succeeded"
