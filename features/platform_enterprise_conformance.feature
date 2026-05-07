Feature: Epoch.Platform enterprise conformance
  Epoch.Platform Core and SDK must cover identity, API safety, secrets,
  policy, webhooks, event streams, audit export, and compliance operations.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"
    And I create protected environment "production" in project "platform"
    And I create deployable "api-web" from repository "api" for project "platform"

  Scenario: SSO, SCIM, service accounts, tokens, and sessions are audited
    Given I create platform user "admin" with email "admin@acme.test"
    And I configure SSO provider "okta" with protocol "oidc"
    And I provision SCIM user "dev" with group "engineering"
    When I create service account "terraform" with scopes "projects:write,deployments:write"
    And I issue API token "iac-token" for service account "terraform"
    And I open session "admin-browser" for user "admin"
    And I revoke API token "iac-token"
    And I revoke session "admin-browser"
    Then service account "terraform" has scope "deployments:write"
    And API token "iac-token" is revoked
    And session "admin-browser" is revoked
    And the latest audit event is "identity.session.revoked"

  Scenario: API idempotency, correlation, webhooks, and event stream are reproducible
    Given I open API request "req-1" with idempotency key "deploy-plan-1"
    When I generate an idempotent deploy plan for deployable "api-web" to environment "production"
    And I generate an idempotent deploy plan for deployable "api-web" to environment "production"
    Then the idempotent deploy plan ids match
    And the latest API response has correlation id "req-1"
    When I register webhook endpoint "ops" with secret "whsec"
    Then signed webhook verification for endpoint "ops" succeeds
    When I read the platform event stream from cursor "0"
    Then platform events include "deployment.plan.created"
    And platform events include "api.request.completed"

  Scenario: Secret rotation, least privilege access, audit export, and retention are enforced
    Given I create service account "terraform" with scopes "secrets:read,audit:read"
    And I add secret reference "DATABASE_URL" with value "postgres://prod" to environment "production"
    When I rotate secret reference "DATABASE_URL" with value "postgres://rotated"
    And I grant secret "DATABASE_URL" access to service account "terraform"
    And service account "terraform" reads secret reference "DATABASE_URL"
    Then secret access never exposes plaintext "postgres://rotated"
    And audit export includes "secret.accessed"
    When I set audit retention policy to "365d"
    And I generate compliance report
    Then compliance report includes "encrypted secrets at rest"
    And compliance report includes "audit retention 365d"

  Scenario: Tenant export, delete, and typed errors carry safe diagnostics
    When I export tenant "acme"
    Then tenant export includes project "platform"
    When I request typed error sample "policy_denied"
    Then the platform action fails with code "policy_denied"
    And the platform action has a correlation id
    When I delete tenant export "acme"
    Then tenant export "acme" is deleted
