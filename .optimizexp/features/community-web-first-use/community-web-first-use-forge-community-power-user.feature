@optimizexp @ux @persona:forge-community-power-user @interface:web @persona-review
Feature: Community Web cold entry for a forge and community power user
  As a forge and community power user
  I want the first viewport to establish place, state, and participation
  So that I can join the community without decoding a prototype

  Background:
    Given persona "forge-community-power-user" is active
    And feature "community-web-first-use" is under optimizexp review

  Scenario: Forge power user orients from a cold desktop entry
    Given the seeded Community Web server is running with `npm run vercel:community-web`
    When I open `/community` in a fresh 1440 by 900 browser viewport
    Then I can see "Epoch Civic Workshop", "# general", and the live or snapshot state in the first viewport
    And community messages and the "Message #general" composer are readable without horizontal clipping
    And the rail distinguishes Communities, Channels, and Linked projects

  Scenario: Forge power user recognizes honest snapshot fallback
    Given the Community Web document has no reachable mutation API
    When I open `/community` and inspect its honesty banner and connection status
    Then the surface visibly says "Snapshot" or "offline"
    And sample conversations remain usable for orientation
    And no control implies an unrecorded action succeeded
