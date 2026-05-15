@competition @triplit @local-first @database
Feature: Fullstack local-first database
  Triplit differentiates by packaging schemas, reactive queries, client cache,
  realtime sync, offline support, and a database console into one TypeScript
  developer experience.
  The implementation is strong for app teams that want fast local-first UX.
  The implementation is weaker when teams need repository governance,
  signed artifact history, or standard SQL compatibility.

  Background:
    Given a product team is building a realtime application
    And the app must keep working during poor network conditions

  Scenario: Developer defines a TypeScript schema
    Given the developer creates a Triplit collection schema
    When the app starts using that schema on the client and server
    Then the developer gets typed query results
    And runtime validation applies to the synced data

  Scenario: UI subscribes to live local data
    Given a component uses Triplit's query hooks
    When matching records change locally or remotely
    Then the query result updates reactively
    And the UI can render without hand-written polling or cache invalidation

  Scenario: User keeps working offline
    Given the network connection drops
    When the user edits records stored by Triplit
    Then durable local storage preserves the edits
    And Triplit retries syncing after reconnect
