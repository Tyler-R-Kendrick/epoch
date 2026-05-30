Feature: Community Web channel experience
  Epoch Community Web behaves like a focused social workspace for signed project collaboration.

  @persona.maintainer
  Scenario: Maintainer opens the channel feed and sees social conversations first
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    Then the Community Web shows the channel rail and message feed
    And signed project actions are collapsed until I select a message

  @persona.maintainer
  Scenario: Maintainer promotes a community idea into an intent
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I select the "Dashboard widget should group revenue by region" community message
    And I mark the selected message as an intent candidate
    Then the live API records a change proposal for the selected conversation

  @persona.maintainer
  Scenario: Maintainer requests an agent from a selected conversation
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I select the "Dashboard widget should group revenue by region" community message
    And I request an agent from the selected message
    Then the selected message shows that human review remains required

  @persona.github_open_source_contributor
  Scenario: Contributor adds a unified signed comment to the current channel
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I add a community reply "Keyboard navigation works in the preview."
    Then the reply appears in the message feed with signed comment metadata

  @persona.security_compliance_responder
  Scenario: Moderator reports a selected conversation for legal hold
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I select the "Dashboard widget should group revenue by region" community message
    And I report the selected message
    Then the selected message shows legal-hold evidence status
