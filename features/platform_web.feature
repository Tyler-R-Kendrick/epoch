Feature: Epoch.Platform web console
  Epoch.Platform.Web provides the app surface over Core and SDK behavior with a
  mobile-native, accessible, operations-first user experience.

  @persona.platform_operator
  Scenario: Mobile operator console preserves scope and next action
    Given an Epoch Platform web console model with Community disabled
    And the web console model is production ready
    And the web console model has project "platform" environment "production" deployable "api-web"
    And the web console model primary action is "Deploy to production"
    When I render the Epoch Platform web console at width 360
    Then the web console shows "Production ready"
    And the web console shows "platform / production / api-web"
    And the web console primary action is "Deploy to production"
    And the web console hides navigation item "Community"
    And the web console has accessible label "Ask AI about platform"
    And the web console uses mobile navigation

  @persona.platform_operator
  Scenario: Community-enabled console exposes moderated community surface
    Given an Epoch Platform web console model with Community enabled
    And the web console model has project "platform" environment "production" deployable "api-web"
    And the web console model Community moderation state is "pending_review"
    When I render the Epoch Platform web console at width 1024
    Then the web console shows navigation item "Community"
    And the web console shows "Community review: pending_review"
    And the web console uses desktop navigation

  @persona.platform_operator
  Scenario: Community-enabled console exposes the public project showcase
    Given an Epoch Platform web console model with Community enabled
    And the web console model Community project page has slug "epoch-platform" readme "Enterprise-ready self-hosted forge" deploy badge "healthy" contribution prompt "Start with a good first issue" bookmarks 3 discussions 2
    When I render the Epoch Platform web console at width 1024
    Then the web console shows "epoch-platform"
    And the web console shows "Enterprise-ready self-hosted forge"
    And the web console shows "Deploy badge: healthy"
    And the web console shows "Start with a good first issue"
    And the web console shows "3 bookmarks"
    And the web console shows "2 discussions"
