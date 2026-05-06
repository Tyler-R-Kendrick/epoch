@competition @pijul
Feature: Commutative patch-based version control
  Pijul models independent changes so they can be applied in any order.

  Scenario: User records independent changes
    Given two contributors make independent changes
    When the changes are applied in either order
    Then Pijul preserves the same resulting repository identity
    And users do not need Git-style rebasing to keep history clean

  Scenario: User resolves a modeled conflict
    Given two changes conflict with each other
    When the user records a conflict resolution
    Then the resolution is itself a change
    And the same conflict does not need to be solved again later

