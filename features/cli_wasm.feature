Feature: CLI and WASM integration surfaces
  Epoch exposes tested command-line and WASM-facing entrypoints for agents and tools.

  @persona.github_open_source_contributor
  Scenario: CLI records, verifies, lists, and resolves repository content
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    And the CLI output contains "initialized Epoch repository"
    When I write raw workspace file "note.txt" with content "hello\n"
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
    When I write raw workspace file "base.json" with content "{\"ready\":false}\n"
    And I write raw workspace file "left.json" with content "{\"ready\":true}\n"
    And I write raw workspace file "right.json" with content "{\"ready\":false}\n"
    And I run the Epoch CLI with arguments:
      | resolve          |
      | --type           |
      | application/json |
      | base.json        |
      | left.json        |
      | right.json       |
    Then the CLI exits with code 0
    And the CLI output contains "\"ready\": true"

  @persona.github_open_source_contributor
  Scenario: Contributor creates a stable Change as a signed revision
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | change |
      | create |
      | Parser |
    Then the CLI exits with code 0
    And the CLI output contains "epoch:change:"
    When I run the Epoch CLI with arguments:
      | events |
    Then the CLI exits with code 0
    And the CLI output contains "change.created"
    When I run the Epoch CLI with arguments:
      | verify |
    Then the CLI exits with code 0
    And the CLI output contains "ok"

  @persona.github_open_source_contributor
  Scenario: CLI policy, view, sync, Git import/export, and DR commands are covered
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    And I write raw workspace file "intent.txt" with content "intent\n"
    And I run the Epoch CLI with arguments:
      | intent          |
      | --type          |
      | text/plain      |
      | --title         |
      | Update intent |
      | --description   |
      | Adds intent   |
      | --label         |
      | docs,ready      |
      | intent.txt      |
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
    Then the CLI output contains "checked out review (1 intents)"
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

  @persona.github_open_source_contributor
  Scenario: CLI errors and Git compatibility command wrapper return failures
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | unknown |
    Then the CLI exits with code 1
    And the CLI error contains "unknown command"
    Given a Git repository with "docs/readme.md" containing "from git\n"
    When I run the Epoch Git CLI in the Git repository with arguments:
      | init |
    Then the CLI exits with code 0
    And the CLI output contains "initialized Git-compatible Epoch repository"
    When I run the Epoch Git CLI in the Git repository with arguments:
      | status |
    Then the CLI exits with code 0
    And the CLI output contains "Epoch repository verifies successfully"
    When I run the Epoch Git CLI in the Git repository with arguments:
      | rebase |
    Then the CLI exits with code 1
    And the CLI error contains "not supported"

  @persona.github_open_source_contributor
  Scenario: WASM exports support CRDT helpers and reject native Git operations
    Given a new workspace
    When I merge JSON through the WASM CRDT registry
    Then the WASM merge result equals JSON {"name":"epoch","ready":true}
    When I run unsupported WASM Git execute command "status"
    Then WASM Git fails with "native Git repository access is unavailable"
    When I run unsupported WASM Git clone for "https://example.invalid/repo.git"
    Then WASM Git fails with "native Git clone is unavailable"

  @persona.github_open_source_contributor
  Scenario: Contributor merges concurrent dependency additions without a false conflict
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    When I write raw workspace file "base.json" with content "{\n  \"zod\": \"4\"\n}\n"
    And I write raw workspace file "mine.json" with content "{\n  \"zod\": \"4\",\n  \"xstate\": \"5\"\n}\n"
    And I write raw workspace file "theirs.json" with content "{\n  \"zod\": \"4\",\n  \"playwright\": \"1\"\n}\n"
    And I run the Epoch CLI with arguments:
      | semantic    |
      | merge       |
      | base.json   |
      | mine.json   |
      | theirs.json |
    Then the CLI exits with code 0
    And the CLI output contains "\"xstate\": \"5\""
    And the CLI output contains "\"playwright\": \"1\""
    And the CLI output contains "\"zod\": \"4\""

  @persona.github_open_source_contributor
  Scenario: Contributor sees a diff name the changed value, not the surrounding lines
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    When I write raw workspace file "before.json" with content "{\n  \"name\": \"epoch\",\n  \"version\": \"0.1.0\"\n}\n"
    And I write raw workspace file "after.json" with content "{\n  \"name\": \"epoch\",\n  \"version\": \"0.2.0\"\n}\n"
    And I run the Epoch CLI with arguments:
      | semantic     |
      | diff         |
      | before.json  |
      | after.json   |
    Then the CLI exits with code 0
    And the CLI output contains "update object#0/member:version"
    And the CLI output does not contain "member:name"

  @persona.maintainer
  Scenario: Maintainer is told when a discovered extension is not trusted
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | ext  |
      | list |
    Then the CLI exits with code 0
    And the CLI output contains "no extensions discovered"
