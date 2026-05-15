@competition @zero @local-first @sync-engine
Feature: Query-driven local-first sync
  Zero differentiates by syncing the data a UI query needs into a local
  normalized store, then keeping reads and writes instant while the server
  remains authoritative.
  The implementation is strong for fast Postgres-backed web applications.
  The implementation is weaker when teams need repository-level audit,
  branch review, signed history, or multi-artifact governance.

  Background:
    Given a web application uses Postgres as the source of record
    And users expect large workspaces to feel instant

  Scenario: UI reads from the client store first
    Given a user opens a workspace view backed by a Zero query
    When the component subscribes with Zero's client query API
    Then matching cached rows render from the local store immediately
    And the server returns authoritative results in the background

  Scenario: User writes optimistically through a mutator
    Given the user changes a record in the application
    When the app calls a Zero mutator
    Then open local queries update immediately
    And the change syncs through the server-controlled write path

  Scenario: Developer narrows sync scope with queries
    Given a workspace has more data than the user should preload
    When the developer expresses the current view as a query
    Then Zero syncs the rows needed by that query
    And cached rows can be reused by future views
