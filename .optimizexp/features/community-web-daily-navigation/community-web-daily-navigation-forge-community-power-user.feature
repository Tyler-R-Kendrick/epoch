@optimizexp @ux @persona:forge-community-power-user @interface:web @persona-review
Feature: Community Web daily navigation for a forge and community power user
  As a maintainer used to GitHub, Tangled, Discord, and Slack
  I want community, discovery, and repository planes to stay distinct
  So that I can catch up without losing my place

  Background:
    Given persona "forge-community-power-user" is active
    And feature "community-web-daily-navigation" is under optimizexp review

  Scenario: Forge power user traverses community network and repository planes
    Given I opened `/community` from `npm run vercel:community-web` in Epoch Civic Workshop #general
    When I open Network Feed, return to Epoch Civic Workshop, open linked project epoch/epoch, and open Issues
    Then each active control and main heading agree about the current plane
    And Network Feed shows Following, Network, and Contributions tabs
    And linked repository issues do not replace the community identity in the rail

  Scenario: Forge power user navigates the stacked narrow layout by keyboard
    Given I opened `/community` in a 390 by 844 viewport from `npm run vercel:community-web`
    When I use only Tab and Enter to reach Agent Guild and its agent-runs channel
    Then focus is visible on every activated control
    And the selected community and channel remain visible and textually identified
    And the main feed is reachable without horizontal overflow or an unbounded rail
