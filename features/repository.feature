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

  Scenario: Create an empty repository with one command
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | create   |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    And the CLI output contains "created Epoch repository"
    And the repository verifies successfully
    And the event log contains 0 events
    And the repository identity uses Ed25519 keys

  Scenario: Push assets to create a repository and first version
    Given a new workspace
    When I write raw workspace file "dist/index.html" with content "<h1>Hello</h1>\n"
    And I run the Epoch CLI with arguments:
      | push         |
      | dist         |
      | --author     |
      | alice        |
      | --version    |
      | initial-site |
    Then the CLI exits with code 0
    And the CLI output contains "version initial-site"
    And the repository verifies successfully
    And the event log contains 2 events
    And the latest version is named "initial-site"
    And the version manifest includes file "dist/index.html"

  Scenario: Push skips repository metadata directories
    Given a new workspace
    When I write raw workspace file "asset.txt" with content "asset\n"
    And I write raw workspace file ".git/config" with content "private metadata\n"
    And I run the Epoch CLI with arguments:
      | push     |
      | .        |
      | --author |
      | alice    |
      | --version |
      | assets   |
    Then the CLI exits with code 0
    And the repository verifies successfully
    And the version manifest includes file "asset.txt"
    And the version manifest does not include file ".git/config"

  Scenario: Materialize a version into a clean directory
    Given a new workspace
    When I write raw workspace file "dist/index.html" with content "<h1>Hello</h1>\n"
    And I run the Epoch CLI with arguments:
      | push         |
      | dist         |
      | --author     |
      | alice        |
      | --version    |
      | initial-site |
    And I run the Epoch CLI with arguments:
      | version     |
      | materialize |
      | initial-site |
      | --out       |
      | deploy      |
    Then the CLI exits with code 0
    And workspace file "deploy/dist/index.html" contains "<h1>Hello</h1>\n"
    And workspace JSON file "deploy/epoch-version.json" has property "name" equal to "initial-site"

  Scenario: Refuse to overwrite materialized output by default
    Given a new workspace
    When I write raw workspace file "dist/index.html" with content "<h1>Hello</h1>\n"
    And I run the Epoch CLI with arguments:
      | push         |
      | dist         |
      | --author     |
      | alice        |
      | --version    |
      | initial-site |
    And I write raw workspace file "deploy/keep.txt" with content "keep\n"
    And I run the Epoch CLI with arguments:
      | version     |
      | materialize |
      | initial-site |
      | --out       |
      | deploy      |
    Then the CLI exits with code 1
    And the CLI error contains "would overwrite files"

  Scenario: Version CRDT state as a deployable snapshot
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I append CRDT map value for "tasks" key "build" as "alice" with JSON {"status":"ready"}
    And I run the Epoch CLI with arguments:
      | version     |
      | create      |
      | agent-state |
      | --entity    |
      | tasks       |
    Then the CLI exits with code 0
    And the latest version is named "agent-state"
    And the version manifest includes entity "tasks"
    When I run the Epoch CLI with arguments:
      | version     |
      | materialize |
      | agent-state |
      | --out       |
      | deploy      |
    Then workspace JSON file "deploy/tasks.json" has property "build.status" equal to "ready"

  Scenario: SDK open-or-create pushes assets and materializes a version
    Given a new workspace
    When I write raw workspace file "site/app.js" with content "console.log('ready')\n"
    And I push "site" through the SDK as "alice" versioned "sdk-site"
    Then the repository verifies successfully
    And the latest version is named "sdk-site"
    When I materialize version "sdk-site" through the SDK into "sdk-deploy"
    Then workspace file "sdk-deploy/site/app.js" contains "console.log('ready')\n"

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

  Scenario: Sync command surface synchronizes repositories
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    And a peer Epoch repository initialized as "bob"
    When I sync with the peer repository
    Then the peer repository verifies successfully
    And the peer event log contains 1 event
    And the peer recorded blob content equals "hello\n"

  Scenario: Intent merge signatures advance the main projection
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "hello\n" as "text/plain"
    Then the last intent status is "pending"
    When "bob" signs the intent merge
    And "carol" signs the intent merge
    Then the last intent status is "merged"
    And the main projection contains the last intent
    Then the repository verifies successfully
    And the event log contains 3 events

  Scenario: Rejected intents remain on the ledger but are skipped by main
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "bad\n" as "text/plain"
    And "bob" rejects the intent with reason "not ready"
    Then the last intent status is "rejected"
    And the main projection skips the last intent
    And the event log contains 2 events

  Scenario: Intent workflow events carry signed metadata
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create an intent for "note.txt" with content "hello\n" as "text/plain" titled "Update note" described "Adds greeting" labeled "docs,ready"
    Then the last event metadata title is "Update note"
    And the last event metadata description is "Adds greeting"
    And the last event metadata labels are "docs,ready"
    When "bob" signs the intent merge with reason "looks good" labeled "reviewed"
    Then the last event metadata reason is "looks good"
    And the last event metadata labels are "reviewed"
    When "carol" comments "Please add tests" on the intent labeled "review"
    Then the last event comment body is "Please add tests"
    And the last event comment references the last intent
    And the last event metadata labels are "review"
    When "dave" rejects the intent with reason "needs changes" labeled "blocked"
    Then the last event metadata reason is "needs changes"
    And the last event metadata labels are "blocked"
    And the event log contains 4 events

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
