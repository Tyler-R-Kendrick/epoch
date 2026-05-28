Feature: Epoch.Platform Community conformance
  When Community is enabled it must provide showcase, discovery, reputation,
  moderation, abuse controls, and legal/export hooks. When disabled it must
  cleanly return feature-disabled behavior.

  Background:
    Given an Epoch Platform instance with Community disabled
    And I create organization "acme" through the platform SDK
    And I create project "platform" in organization "acme"
    And I create repository "api" in project "platform"

  Scenario: Public showcases, topics, releases, contribution, and reputation are discoverable
    Given I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    And I approve the Community project as moderator "mod"
    When I add Community topic "self-hosting" to project "epoch-platform"
    And I add showcase asset "logo.png" to Community project "epoch-platform"
    And I publish Community release "v1.0.0" for project "epoch-platform"
    And I create public profile "alice"
    And public profile "alice" contributes to Community project "epoch-platform"
    Then Community project "epoch-platform" public page has topic "self-hosting"
    And Community project "epoch-platform" public page has release "v1.0.0"
    And public profile "alice" reputation is 10
    When I search Community for "self-hosting"
    Then Community search includes project "epoch-platform"

  Scenario: Abuse controls, blocking, takedowns, and legal hold are audited
    Given I enable Community through the platform SDK
    And I publish project "platform" to Community as "epoch-platform"
    And I approve the Community project as moderator "mod"
    And I create public profile "alice"
    When public profile "alice" opens discussion "One" on Community project "epoch-platform"
    And public profile "alice" opens discussion "Two" on Community project "epoch-platform"
    And public profile "alice" opens discussion "Three" on Community project "epoch-platform"
    And public profile "alice" tries to open discussion "Four" on Community project "epoch-platform"
    Then the platform action fails with code "rate_limited"
    And the platform action suggests "Wait before posting again"
    When moderator "mod" takes down discussion "One" for reason "abuse"
    And public profile "alice" blocks public profile "mod"
    And I export Community legal hold for project "epoch-platform"
    Then discussion "One" moderation state is "taken_down"
    And Community legal hold includes discussion "One"
    And the latest audit event is "community.legal_hold.exported"

  Scenario: Disabled Community hides social APIs and workers without blocking Core
    When I try to create public profile "alice"
    Then the platform action fails with code "feature_disabled"
    And the platform action suggests "Enable Community"
    And Community background workers are disabled
    When I create repository "private-api" in project "platform"
    Then the project "platform" overview lists repository "private-api"
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for platform_community_conformance.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/platform_community_conformance.feature | A maintainer | Reducing Maintainer And Contributor Burnout | moderation | publish Community showcases, topics, releases, contribution guidance, reputation, search, abuse controls, and worker state |
