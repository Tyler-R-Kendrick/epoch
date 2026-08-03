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

  @persona.slack_power_user
  Scenario: Contributor searches community receipts by harness and intent
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I search community receipts for "goose"
    Then the receipt search reports at least one match
    And a visible agent receipt includes harness "goose"

  @persona.github_power_user
  Scenario: Maintainer sees promote receipt after recording an intent
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    When I select the "Dashboard widget should group revenue by region" community message
    And I mark the selected message as an intent candidate
    Then the Community Web shows a signed promote receipt for the new proposal

  @persona.github_open_source_contributor
  Scenario: Contributor keeps signed actions after a live refresh
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When the community repository refreshes from the live API
    And I select the "Welcome to Epoch Civic Workshop" community message
    Then the selected message keeps the Mark intent and Report signed actions

  @persona.bluesky_power_user
  Scenario: Contributor sees state-driven identity honesty on a live API session
    Given the Community Web live API has repository activity
    When I open the Community Web channel experience
    Then the identity chip uses auth state "api-session"
    And the identity chip explains that AT OAuth is not linked

  @persona.github_open_source_contributor
  Scenario: Contributor sees an inviting empty state in a quiet channel
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I open the support channel in the active community
    Then the channel shows an empty state naming a next action

  @persona.slack_power_user
  Scenario: Contributor searching with no matches sees the query named back
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I search community receipts for "zzzznomatch"
    Then the feed shows a zero-result state naming "zzzznomatch"

  @persona.slack_power_user
  Scenario: Contributor clears receipt search with Escape
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I search community receipts for "goose"
    When I press Escape in the receipt search
    Then the receipt search is empty and announces the channel

  @persona.maintainer
  Scenario: Contributor sees unread only for channels with new activity
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    Then no channel shows an unread count on a first visit
    When the ideas channel gains activity after I last read it
    Then the ideas channel shows an unread count

  @persona.github_open_source_contributor
  Scenario: Contributor dismisses the first-run orientation strip
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    Then the first-run orientation strip explains the rail, feed, and promote path
    When I dismiss the first-run orientation strip
    And I reopen the Community Web channel experience
    Then the first-run orientation strip stays dismissed

  @persona.security_compliance_responder
  Scenario: Contributor reveals the record behind a signature
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    When I reveal the provenance of the "Welcome to Epoch Civic Workshop" message
    Then the provenance panel names the signature, anchor, and source

  @persona.github_power_user
  Scenario: Maintainer follows a promoted message to the change it became
    Given the Community Web live API has repository activity
    And I open the Community Web channel experience
    And I open the ideas channel in the active community
    And I select the "Dashboard widget should group revenue by region" community message
    And I mark the selected message as an intent candidate
    When I view the lineage of the promoted message
    Then the origin message and the resulting change are marked as one contribution
