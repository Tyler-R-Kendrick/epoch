@optimizexp @ux @persona:screen-reader-power-user @interface:web
Feature: Accessible search and projection workbench for a screen reader power user
  As a screen reader power user
  I want the same deterministic search and projection controls by keyboard
  So that completeness, errors, and queued changes remain understandable without sight

  Background:
    Given persona "screen-reader-power-user" is active
    And feature "community-web-search-projections" is under optimizexp review

  Scenario: Screen reader power user completes search and projection review
    Given Nightboard focus is on the hierarchical navigator
    When I press Ctrl+F, enter `kind:(issue OR change)`, inspect Explain, and save a projection
    Then Query, Results, Explain, and History are named keyboard-reachable regions
    And result count, source completeness, collisions, and validation errors are announced
    And closing the workbench restores focus to the selected canonical object

  Scenario: Queued projection changes preserve the reading anchor
    Given I am reading an entity while a queued projection receives updates
    When the sticky queued-change count is announced
    Then my current sentence and selection do not move
    And applying the queue preserves focus by occurrence ID and target ID
