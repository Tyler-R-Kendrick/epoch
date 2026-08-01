@optimizexp @ux @persona:app-builder-design-power-user @interface:web @persona-review
Feature: Community Web first-viewport craft for a design-led builder
  As a design-led app builder power user
  I want the rendered first viewport to feel intentional and usable
  So that design-system claims survive contact with the product

  Background:
    Given persona "app-builder-design-power-user" is active
    And feature "community-web-first-use" is under optimizexp review

  Scenario: Design power user judges the first viewport hierarchy
    Given the seeded Community Web server is running with `npm run vercel:community-web`
    When I open `/community` in a fresh 1440 by 900 browser viewport
    Then the dark rail and light work surface create a clear reading order
    And author, message, trust metadata, and composer have distinct visual weights
    And no browser-default control, clipped label, or accidental empty region dominates the viewport

  Scenario: Design power user identifies the primary participation action
    Given I opened `/community` from `npm run vercel:community-web`
    When I scan the first viewport without prior Epoch vocabulary
    Then the message composer is visually attached to the active channel
    And its input and Send action are recognizable without relying on color alone
    And provenance labels do not overpower message content
