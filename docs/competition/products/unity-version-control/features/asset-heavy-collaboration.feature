Feature: Asset-heavy collaboration for games and 3D projects
  Unity Version Control differentiates by combining distributed source workflows with artist-friendly centralized workflows and asset locks.
  The implementation is strong when a repository contains binary scenes, prefabs, models, and code.
  The implementation is weaker when teams want one minimal, engine-neutral surface with few clients or configuration points.

  Background:
    Given a game team stores source files and binary assets in one repository
    And programmers and artists need different workflows over the same project

  Scenario: Artist works in a centralized Gluon workspace
    Given an artist opens a workspace optimized for asset work
    When the artist modifies scene or model assets
    And checks in selected pending changes
    Then Unity Version Control records the changeset
    And teammates can view file history and affected assets

  Scenario: Programmer develops on a task branch
    Given a programmer creates a branch from main
    When the programmer edits code and project files
    And checks in a tested changeset
    And requests a code review
    Then reviewers can inspect the branch changes
    And the branch can be merged back after approval

  Scenario: Team avoids binary conflicts with Smart Locks
    Given a lock rule protects scene or asset files
    When a collaborator attempts to edit a protected file
    Then the system checks whether the file can be locked safely
    And prevents conflicting work when another user already owns the lock

  Scenario: Reviewer inspects a 3D asset change
    Given a branch changes a supported 3D file
    When the reviewer opens the repository file explorer
    And compares two changesets side by side
    Then the reviewer can rotate, pan, zoom, inspect metadata, and review the visual delta
