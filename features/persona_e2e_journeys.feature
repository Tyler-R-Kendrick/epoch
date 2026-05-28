Feature: Persona end-to-end product journeys
  Documented personas must be able to complete real Epoch workflows that cut
  across repository, Community, Platform, web, operations, and governance
  features.

  @e2e @persona.github_open_source_contributor
  Scenario: A GitHub open-source contributor carries signed local work into Community
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "docs/guide.md" with content "ship notes\n" as "text/plain"
    Then the last intent status is "pending"
    When "bob" signs the intent merge
    And "carol" signs the intent merge
    Then the last intent status is "merged"
    And the main projection contains the last intent
    And the repository verifies successfully
    When I export to a Git repository
    Then the exported Git file "docs/guide.md" contains "ship notes\n"
    Given the Epoch Community API has a repository named "epoch/epoch"
    When I open Epoch Community Web in a Playwright browser
    Then the Community browser shows repository "epoch/epoch"
    And the Community browser exposes workflow "Issues"
    And the Community browser exposes workflow "Change Reviews"
    And the Community browser exposes the Epoch Community design system

  @e2e @persona.maintainer
  Scenario: A maintainer reviews work and moderates public collaboration
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    And I approve the Community project as moderator "mod"
    And I create public profile "alice"
    When public profile "alice" opens discussion "Roadmap" on Community project "epoch-platform"
    And I report discussion "Roadmap" for reason "spam"
    Then the Community moderation queue contains discussion "Roadmap"
    When moderator "mod" resolves report for discussion "Roadmap"
    Then the Community moderation queue is empty
    When I create issue "Ship API" in project "platform"
    And I create review intent "Add API endpoint" for repository "api" linked to issue "Ship API"
    And I record check "ci" with status "passed" on the review intent
    And I ask AI to summarize the review intent
    And I approve the review intent as "maintainer"
    And I merge the review intent
    Then the review intent state is "merged"
    And issue "Ship API" is linked to the review intent
    And the latest audit event is "review_intent.merged"

  @e2e @persona.platform_operator
  Scenario: A platform operator understands cost, risk, deploy health, and rollback
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    When I inspect platform first-run readiness
    Then first-run readiness is not production ready
    And first-run readiness includes incomplete step "Connect infrastructure"
    When I register runner "local-runner" with capacity 2
    And I configure backup destination "s3://epoch-backups"
    And I add secret reference "DATABASE_URL" with value "postgres://secret" to environment "production"
    And I generate a deploy plan for deployable "api-web" to environment "production"
    Then the deploy plan references secret "DATABASE_URL"
    And the deploy plan does not expose secret value "postgres://secret"
    And the deploy plan impact summary contains "1 deployable"
    And the deploy plan rollback strategy is "previous-successful-deployment"
    When I approve the deploy plan as "ops-lead"
    And I execute the deploy plan
    Then the latest deployment state is "succeeded"
    And the latest deployment health is "healthy"
    When I mark the latest deployment degraded with reason "health check failed"
    Then the incident diagnosis severity is "high"
    And the incident diagnosis recommends "Rollback deployment"
    When I roll back the latest deployment as "incident-lead"
    Then the latest deployment state is "rolled_back"
    And the latest audit event is "deployment.rolled_back"

  @e2e @persona.security_and_compliance_responder
  Scenario: A security and compliance responder protects identity, secrets, and tenant data
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"
    And I create platform user "admin" with email "admin@acme.test"
    And I configure SSO provider "okta" with protocol "oidc"
    And I provision SCIM user "dev" with group "engineering"
    When I create service account "terraform" with scopes "secrets:read,audit:read"
    And I issue API token "iac-token" for service account "terraform"
    And I open session "admin-browser" for user "admin"
    And I revoke API token "iac-token"
    And I revoke session "admin-browser"
    Then API token "iac-token" is revoked
    And session "admin-browser" is revoked
    When I add secret reference "DATABASE_URL" with value "postgres://prod" to environment "production"
    And I rotate secret reference "DATABASE_URL" with value "postgres://rotated"
    And I grant secret "DATABASE_URL" access to service account "terraform"
    And service account "terraform" reads secret reference "DATABASE_URL"
    Then secret access never exposes plaintext "postgres://rotated"
    And audit export includes "secret.accessed"
    When I export tenant "acme"
    Then tenant export includes project "platform"
    When I request typed error sample "policy_denied"
    Then the platform action fails with code "policy_denied"
    And the platform action has a correlation id
    When I delete tenant export "acme"
    Then tenant export "acme" is deleted

  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for persona_e2e_journeys.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec | persona | pain point | human consideration | journey |
        | features/persona_e2e_journeys.feature | A GitHub open-source contributor | Trusting Current State | human-centered design | prove documented personas can complete end-to-end app workflows |
