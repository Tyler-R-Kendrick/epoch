@optimizexp @ux @persona:forge-community-power-user @interface:web @persona-review
Feature: Signed collaboration from a Community Web conversation
  As a forge community maintainer
  I want promotion and agent actions to be inspectable and fail closed
  So that signed workflow means more than a decorative badge

  Background:
    Given persona "forge-community-power-user" is active
    And feature "community-web-signed-collaboration" is under optimizexp review

  Scenario: Forge power user promotes a selected idea with inspectable provenance
    Given I opened `/community` from `npm run vercel:community-web` and selected #ideas
    When I select "Dashboard widget should group revenue by region" and activate Mark intent
    Then the selected conversation exposes Anchor, Signature, and Intent values
    And the visible status names the recorded proposal or clearly says the action failed
    And I can still identify the actor, source message, and active community

  Scenario: Forge power user sees agent review authority and offline recovery
    Given I opened `/community` from `npm run vercel:community-web` with mutation requests blocked
    When I select the dashboard-widget idea, activate Request agent, and then activate Mark intent
    Then the interface states that human review remains required
    And a failed mutation is non-blaming and does not claim success
    And the selected message and a concrete retry or recovery path remain visible
