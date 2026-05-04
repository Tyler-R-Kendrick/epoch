Feature: Epoch repository event log
  Epoch stores immutable content-addressed events in a local repository.

  Scenario: Initialize and record a file
    Given a new workspace
    When I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then the repository verifies successfully
    And the event log contains 1 event
    And the recorded blob content equals "hello\n"
    And the repository identity uses Ed25519 keys
    And the recorded event is signed

  Scenario: Repository hooks observe event-driven lifecycle steps
    Given a new workspace
    And an Epoch repository hook recorder
    When I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then observed repository hooks include "repository.init.before,repository.init.after,repository.recordFile.before,repository.append.before,repository.append.after,repository.recordFile.after"

  Scenario: Detect tampered event content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded event size
    Then repository verification reports "content hash mismatch"

  Scenario: Detect tampered blob content
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    When I tamper with the recorded blob content
    Then repository verification reports "blob hash mismatch"

  Scenario: Reject files outside the repository root
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I try to record "../outside.txt" with content "secret\n" as "text/plain"
    Then recording fails with "outside repository root"

  Scenario: Gossip anti-entropy synchronizes repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I run anti-entropy with the peer repository
    Then the peer repository verifies successfully
    And the peer event log contains 1 event
    And the peer recorded blob content equals "hello\n"

  Scenario: Import from and export to Git repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a Git repository with "docs/readme.md" containing "from git\n"
    When I import the Git repository
    Then the repository verifies successfully
    And the event log contains 1 event
    When I export to a Git repository
    Then the exported Git file "docs/readme.md" contains "from git\n"

  Scenario: Git compatibility clone records provider metadata
    Given a Git repository with "docs/readme.md" containing "from git\n"
    When I clone the Git repository through Epoch Git compatibility
    Then the repository verifies successfully
    And the event log contains 2 events
    And the cloned Epoch Git provider is "git"
    And the cloned Epoch Git remote references the Git repository

  Scenario: Git compatibility commit records an Epoch merge event
    Given a Git repository with "docs/readme.md" containing "from git\n"
    When I clone the Git repository through Epoch Git compatibility
    And I stage Git file "docs/readme.md" with content "changed\n"
    And I commit through Epoch Git compatibility with message "change"
    Then the repository verifies successfully
    And the event log contains 4 events
    And the latest Epoch event has type "git.commit"
    And the latest recorded Git file "docs/readme.md" contains "changed\n"

  Scenario: Unsupported Git compatibility operations explain why
    Given a new workspace
    When I run unsupported Epoch Git command "rebase"
    Then Git compatibility fails with "not supported"
