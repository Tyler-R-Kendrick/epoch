Feature: CLI and WASM integration surfaces
  Epoch exposes tested command-line and WASM-facing entrypoints for agents and tools.

  Scenario: CLI records, verifies, lists, and resolves repository content
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    And the CLI output contains "initialized Epoch repository"
    When I write workspace file "note.txt" with content "hello\n"
    And I run the Epoch CLI with arguments:
      | record     |
      | --type     |
      | text/plain |
      | note.txt   |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | verify |
    Then the CLI exits with code 0
    And the CLI output contains "ok"
    When I run the Epoch CLI with arguments:
      | events |
    Then the CLI exits with code 0
    And the CLI output contains "record"
    When I write workspace file "base.txt" with content "base\n"
    And I write workspace file "left.txt" with content "left\n"
    And I write workspace file "right.txt" with content "left\n"
    And I run the Epoch CLI with arguments:
      | resolve    |
      | --type     |
      | text/plain |
      | base.txt   |
      | left.txt   |
      | right.txt  |
    Then the CLI exits with code 0
    And the CLI output contains "left"

  Scenario: CLI policy, view, sync, Git import/export, and DR commands are covered
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    And I write workspace file "proposal.txt" with content "proposal\n"
    And I run the Epoch CLI with arguments:
      | intent          |
      | --type          |
      | text/plain      |
      | --title         |
      | Update proposal |
      | --description   |
      | Adds proposal   |
      | --label         |
      | docs,ready      |
      | proposal.txt    |
    And I remember the CLI output as "intent"
    And I run the Epoch CLI with remembered argument "intent":
      | merge    |
      | --author |
      | bob      |
      | --reason |
      | accepted |
      | --label  |
      | reviewed |
    And I run the Epoch CLI with remembered argument "intent":
      | reject    |
      | --author  |
      | carol     |
      | --reason  |
      | duplicate |
      | --label   |
      | blocked   |
    And I run the Epoch CLI with remembered argument "intent":
      | comment        |
      | --author       |
      | dave           |
      | --label        |
      | discussion     |
      | --intent       |
      | __REMEMBERED__ |
      | Please test    |
    And I run the Epoch CLI with arguments:
      | status |
    Then the CLI output contains "rejected"
    When I run the Epoch CLI with arguments:
      | main |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | view-create |
      | review      |
      | --parent    |
      | main        |
    And I run the Epoch CLI with arguments:
      | views |
    Then the CLI output contains "review"
    When I run the Epoch CLI with arguments:
      | checkout |
      | review   |
    Then the CLI output contains "checked out review"
    When I run the Epoch CLI with arguments:
      | view-diff |
      | main      |
      | review    |
    Then the CLI output contains "records"
    When I run the Epoch CLI with arguments:
      | view-promote |
      | review       |
      | main         |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | view-delete |
      | review      |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | dr-plan |
    Then the CLI output contains "Epoch HA/DR recovery plan"
    When I run the Epoch CLI with remembered argument "intent":
      | rollback |
    Then the CLI exits with code 0
    Given a Git repository with "docs/readme.md" containing "from git\n"
    When I run the Epoch CLI with Git repository argument:
      | import |
    Then the CLI output contains "imported 1 files"
    When I run the Epoch CLI export into a fresh Git repository
    Then the CLI output contains "exported"

  Scenario: CLI errors and Git compatibility command wrapper return failures
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | unknown |
    Then the CLI exits with code 1
    And the CLI error contains "unknown command"
    When I run the Epoch Git CLI with arguments:
      | rebase |
    Then the CLI exits with code 1
    And the CLI error contains "not supported"

  Scenario: WASM exports support CRDT helpers and reject native Git operations
    Given a new workspace
    When I merge JSON through the WASM CRDT registry
    Then the WASM merge result equals JSON {"name":"epoch","ready":true}
    When I run unsupported WASM Git execute command "status"
    Then WASM Git fails with "native Git repository access is unavailable"
    When I run unsupported WASM Git clone for "https://example.invalid/repo.git"
    Then WASM Git fails with "native Git clone is unavailable"
