@competition @tangled
Feature: ATProto social coding with Git knots
  Tangled lets developers host Git repositories and collaborate using
  portable AT Protocol identity and on-protocol social metadata.

  Scenario: Developer signs in with an existing AT account
    Given a developer has a Bluesky or other AT Protocol account
    When the developer logs into Tangled with that handle
    Then the same DID is used for authorship of Tangled records
    And no separate forge-only password identity is required

  Scenario: Maintainer creates a repository on a knot
    Given a maintainer is signed in with an AT account
    When the maintainer creates a repository and selects a knot
    Then a repository record is written to the maintainer PDS
    And Git objects are stored on the selected knot
    And the AppView shows a clone URL for Git clients

  Scenario: Contributor opens an issue stored on their PDS
    Given a public Tangled repository
    When a contributor opens an issue
    Then the issue record is stored on the contributor PDS
    And the AppView aggregates the issue onto the repository view

  Scenario: User stars a repository
    Given a public Tangled repository
    When a user stars the repository
    Then a star record is written to the user PDS
    And the social timeline can surface the star activity

  Scenario: Operator self-hosts a knot
    Given an operator has a host and domain
    When the operator runs a knot and verifies it with their DID
    Then repositories can be hosted on that knot
    And the public AppView can still present those repositories
