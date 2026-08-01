@competition @x-com
Feature: High-density public timeline
  X optimizes for rapid scanning of short posts with constant action affordances.

  Scenario: User scrolls the home timeline
    Given the user is signed in
    When the user opens the home timeline
    Then posts are separated by hairline dividers
    And each post shows author, handle, time, body, and an action row

  Scenario: User engages a post
    Given a visible post
    When the user likes the post
    Then the like control reflects the active state
    And the count updates without leaving the timeline
