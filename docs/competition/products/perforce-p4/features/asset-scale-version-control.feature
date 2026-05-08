@competition @perforce @asset-version-control
Feature: Asset-scale centralized version control
  Perforce P4 differentiates by scaling centralized version control for large
  binary assets, global teams, file locking, and enterprise permissions.
  The implementation is strong for game, VFX, semiconductor, and automotive teams.
  The implementation is weaker for teams that want lightweight decentralized Git-style workflows.

  Background:
    Given a distributed team maintains source code and large binary assets
    And some assets cannot be merged safely

  Scenario: Artist locks and submits a binary asset
    Given a 3D asset is stored in a P4 depot
    When an artist checks out the asset with exclusive locking
    Then other users can see that the asset is locked
    And P4 prevents conflicting overwrites
    When the artist submits the changed asset
    Then P4 records the new revision and audit metadata

  Scenario: Global team syncs through edge infrastructure
    Given a studio has contributors in multiple regions
    And P4 proxy or edge servers are configured
    When a remote user syncs a large workspace
    Then P4 can serve content closer to that user
    And the team preserves one controlled versioned repository

  Scenario: Producer reviews project flow through integrated tools
    Given development work is connected to P4 changelists
    When the team uses code review, DAM, or planning tools
    Then technical and creative work remains tied to the versioned asset history
    And managers can trace work across files, changes, and project planning surfaces
