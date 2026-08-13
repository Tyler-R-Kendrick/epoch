@optimizexp @ux @dx @persona:forge-community-power-user @interface:web
Feature: Deterministic mounted projections for a forge community power user
  As a forge community power user
  I want to compose and recover my namespace
  So that familiar navigation remains reversible while canonical identity stays intact

  Background:
    Given persona "forge-community-power-user" is active
    And feature "community-web-search-projections" is under optimizexp review

  Scenario: Forge power user previews and mounts a projection
    Given I cloned `builtin:default` and grouped review work by project and state
    When I preview its tree and namespace diff then mount it before the built-in root
    Then collision and shadow explanations are visible before saving
    And the same canonical object at two paths keeps one target ID and distinct occurrence IDs
    And keyboard selection follows the occurrence I opened

  Scenario: Forge power user recovers from a cyclic custom root
    Given my edited projection contains a cycle and replaced my user root
    When I open `/.epoch/default`
    Then the immutable recovery namespace remains navigable
    And the invalid definition is quarantined and exportable
    And resetting my user namespace preserves canonical objects
