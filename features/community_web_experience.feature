Feature: Community Web community-first experience
  Epoch Community Web opens into a community with its own channels (Discord-like),
  with Network Feed discovery and linked repository projects as secondary planes.

  @persona.github_open_source_contributor
  Scenario: Contributor opens a community and sees community-owned channels first
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    Then the Community Web shows a community with channels
    And the active channel does not require a repository

  @persona.github_open_source_contributor
  Scenario: Contributor opens Network Feed for cross-community discovery
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    And I open the Network Feed
    Then the Community Web shows the Network Feed with activity tabs

  @persona.maintainer
  Scenario: Maintainer switches communities and gets a new channel list
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    And I switch to the Agent Guild community
    And I open the agent-runs channel
    Then the Community Web shows the Agent Guild channels

  @persona.maintainer
  Scenario: Maintainer promotes a community idea into an intent
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I mark the selected message as an intent candidate
    Then the live API records a change proposal for the selected conversation

  @persona.maintainer
  Scenario: Maintainer requests an agent from a selected conversation
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I request an agent from the selected message
    Then the selected message shows that human review remains required

  @persona.maintainer
  Scenario: Maintainer recovers a signed action from snapshot mode
    Given Community Web is running from an honest snapshot
    Then the snapshot banner explains how to reconnect for signed work
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I mark the selected message as an intent candidate
    Then the selected message explains how to reconnect and retry Mark intent

  @persona.github_open_source_contributor
  Scenario: Contributor adds a unified signed comment to the current channel
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I add a community reply "Keyboard navigation works in the preview."
    Then the reply appears in the message feed with signed comment metadata

  @persona.github_open_source_contributor
  Scenario: Contributor reaches a channel conversation on a narrow screen
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I use Community Web at a narrow mobile width
    Then the active conversation remains reachable without an oversized navigation rail
    And I can browse each navigation group without horizontal page overflow
    And conversation reactions meet the Community touch-target floor
    And Community state remains readable and announced
    And the current channel context remains labeled

  @persona.github_open_source_contributor
  Scenario: Contributor keeps community content in reach at 200 percent zoom
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I zoom Community Web to 200 percent in a short viewport
    Then the zoomed navigation remains bounded above community content
    And the zoomed document has no horizontal page overflow

  @persona.security_compliance_responder
  Scenario: Moderator reports a selected conversation for legal hold
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I report the selected message
    Then the selected message shows legal-hold evidence status
