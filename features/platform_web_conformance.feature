Feature: Epoch.Platform web console conformance
  The web console must expose the spec's role-aware, Primer-like, mobile-native
  operational surfaces without hiding required workflows in desktop-only areas.

  Scenario: Mobile console exposes scoped task actions and compact navigation
    Given an Epoch Platform web console model with Community enabled
    And the web console model role is "incident-responder"
    And the web console model has project "platform" environment "production" deployable "api-web"
    And the web console model mobile actions are "Approve,Reject,Comment,Deploy,Rollback,Acknowledge,Ask AI"
    When I render the Epoch Platform web console at width 360
    Then the web console uses mobile navigation
    And the web console shows navigation item "Home"
    And the web console shows navigation item "Projects"
    And the web console shows navigation item "Deployments"
    And the web console shows navigation item "Reviews"
    And the web console shows navigation item "More"
    And the web console shows "platform / production / api-web"
    And the web console primary action is "Rollback"
    And the web console has accessible label "Open command palette"
    And the web console shows "Acknowledge"
    And the web console shows "Ask AI"

  Scenario: Desktop console exposes role-aware home modules and admin governance sections
    Given an Epoch Platform web console model with Community enabled
    And the web console model role is "maintainer"
    And the web console model home modules are "pending reviews,risky deploys,release candidates,recent community activity"
    And the web console model admin sections are "identity and SSO,teams and roles,policy and protected environments,runners and infrastructure,secrets and key rotation,AI providers and tool policy,audit and compliance export,backups and restore drills,Community moderation and visibility,upgrade and support bundle"
    When I render the Epoch Platform web console at width 1200
    Then the web console uses desktop navigation
    And the web console shows "pending reviews"
    And the web console shows "risky deploys"
    And the web console shows "identity and SSO"
    And the web console shows "upgrade and support bundle"
    And the web console has accessible label "Ask AI about platform"

  Scenario: Desktop console exposes accessible dense data, confirmations, and SDK equivalents
    Given an Epoch Platform web console model with Community disabled
    And the web console model table columns are "Name,State,Updated,Actions"
    And the web console model confirmation resource is "production"
    And the web console model SDK equivalent is "sdk.deployments.executePlan(plan.id)"
    When I render the Epoch Platform web console at width 1024
    Then the web console hides navigation item "Community"
    And the web console shows "Name"
    And the web console shows "Updated"
    And the web console shows "Confirm production"
    And the web console shows "sdk.deployments.executePlan(plan.id)"
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for platform_web_conformance.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/platform_web_conformance.feature | A platform operator | Trusting Current State | accessibility | complete web-console tasks across mobile, desktop, role-aware modules, dense data, confirmations, and SDK-equivalent copy |
