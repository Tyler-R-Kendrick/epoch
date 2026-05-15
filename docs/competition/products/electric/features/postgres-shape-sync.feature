@competition @electric @postgres @sync-engine
Feature: Postgres shape sync
  Electric differentiates by streaming live SQL-defined subsets of Postgres
  to local clients, apps, services, and agents.
  The implementation is strong for read-path replication and fan-out.
  The implementation is weaker when teams need built-in write conflict
  resolution, review workflows, or signed repository history.

  Background:
    Given an application stores operational state in Postgres
    And clients only need a scoped subset of the data

  Scenario: Developer defines a shape
    Given a user should see only their open issues
    When the developer defines a shape query for those rows
    Then Electric carves out the matching rows from Postgres
    And clients can subscribe to that live shape

  Scenario: Clients receive ordered updates
    Given Postgres changes rows that match a subscribed shape
    When Electric consumes the logical replication stream
    Then it delivers the same ordered shape log to subscribers
    And each client can update its local store in real time

  Scenario: Application owns writes
    Given a user edits data in the app
    When the app sends the write through its backend API
    Then the backend applies business logic to Postgres
    And Electric later streams the committed change back through the read path
