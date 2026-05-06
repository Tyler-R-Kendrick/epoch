Feature: WASM React state integration
  Epoch exposes browser-safe React helpers that persist framework state changes as materialized Epoch CRDT history.

  Scenario: React hook persists, rewinds, rematerializes, and resumes state changes in a browser
    Given a new workspace
    When I run the Epoch WASM React browser demo
    Then the browser-rendered Epoch React state is "count: 2"
    And the browser-rendered rewind state is "count: 1"
    And the browser-rendered rematerialized state is "count: 5"
    And the browser-rendered restored state is "count: 5"

  Scenario: Browser live repository hooks synchronize through a VFS
    Given a new workspace
    When I run the Epoch WASM React live VFS browser demo
    Then the browser-rendered live VFS history is "events: 2"
    And the browser-rendered live VFS entity is "count: 2"
