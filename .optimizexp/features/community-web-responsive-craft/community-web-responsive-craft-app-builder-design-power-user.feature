@optimizexp @ux @persona:app-builder-design-power-user @interface:web @persona-review
Feature: Community Web responsive visual craft
  As a design-led app builder power user
  I want the real interface to survive responsive and accessibility stress
  So that a polished desktop capture cannot hide unacceptable product artifacts

  Background:
    Given persona "app-builder-design-power-user" is active
    And feature "community-web-responsive-craft" is under optimizexp review

  Scenario: Design power user audits desktop hierarchy and action detail
    Given I opened `/community` from `npm run vercel:community-web` at 1440 by 900
    When I open #ideas and select the dashboard-widget conversation
    Then the selected row, action tray, Anchor, Signature, and Intent values remain visually tied together
    And action labels wrap or size cleanly without card soup, overlap, or clipped text
    And trust styling remains subordinate to the proposal body

  Scenario: Design power user audits narrow layout and touch targets
    Given I opened `/community` from `npm run vercel:community-web` at 390 by 844
    When I inspect the rail, feed, composer, and selected-message tray
    Then the document has no horizontal overflow
    And primary controls remain at least 32 pixels high and do not overlap
    And the main conversation is not buried beneath an effectively full-page navigation wall

  Scenario: Design power user audits zoom focus and reduced motion
    Given I opened `/community` from `npm run vercel:community-web` with reduced motion requested
    When I inspect the interface at 200 percent zoom and move focus through interactive controls
    Then focus indication is visible without color-only meaning
    And labels remain readable without two-dimensional scrolling
    And no motion-dependent state or animated obstruction appears
