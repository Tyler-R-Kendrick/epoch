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
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for wasm_react.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/wasm_react.feature | A GitHub open-source contributor | Preserving Agency And Portability | interrupted session | resume browser-hosted work after interruptions and keep live repository state visible |
