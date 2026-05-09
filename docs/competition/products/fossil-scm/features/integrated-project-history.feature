@competition @fossil @dvcs @self_hosting
Feature: Integrated project history in one repository
  Fossil stores code, documentation, tickets, forum posts, and technotes
  as syncable project artifacts so a clone can preserve more than source files.

  Scenario: Developer starts a self-hosted project appliance
    Given a developer downloads the Fossil executable
    When they initialize a repository and run the built-in web UI
    Then Fossil serves source history, wiki, tickets, forum, and documentation
    And the project can be hosted without assembling separate forge services

  Scenario: Team syncs collaboration context while offline-capable
    Given a teammate cloned a Fossil repository
    And the repository contains check-ins, forum posts, wiki pages, and tickets
    When the teammate synchronizes with the remote
    Then Fossil exchanges sharable project artifacts
    And the teammate can search and inspect prior collaboration context locally

  Scenario: Autosync reduces accidental divergence
    Given autosync is enabled for commit and update commands
    When a developer commits local work
    Then Fossil synchronizes with the configured remote around the operation
    And the team avoids some avoidable forks and merge churn
