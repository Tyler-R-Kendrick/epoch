@competition @automerge @local-first
Feature: Local-first CRDT repository
  Automerge differentiates by packaging application documents, local persistence,
  network sync, and automatic merge into a developer-owned repository model.
  The implementation is strong for offline-first multiplayer apps.
  The implementation is weaker when teams need a complete forge, review, or governance UI.

  Background:
    Given an application stores collaborative user data
    And users need to continue working while offline or on unreliable networks

  Scenario: User edits a local document while offline
    Given the app has created an Automerge document in a repo
    And the repo has a local storage adapter
    When the user changes the document without network access
    Then Automerge records the change locally
    And the app can render the updated state immediately

  Scenario: Peers synchronize after reconnecting
    Given two peers changed related document state independently
    When their network adapters exchange Automerge sync messages
    Then Automerge merges the changes without asking users to resolve a text conflict
    And each peer receives the same converged document state

  Scenario: Developer swaps infrastructure adapters
    Given a developer starts with browser local storage and tab-to-tab sync
    When the app moves to a server-backed deployment
    Then the developer can configure different storage or network adapters
    And the application model remains centered on the same document handles
