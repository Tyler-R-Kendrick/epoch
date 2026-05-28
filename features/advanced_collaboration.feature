Feature: Advanced Epoch collaboration and repository infrastructure
  Epoch supports signed collaboration objects, gate policy, transports, operation events, media-aware merges, redactions, reusable conflict resolutions, and pluggable serialization.

  @persona.github_open_source_contributor
  Scenario: Signed issues, reviews, CI, and gate policy project deterministic collaboration state
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I create a signed issue titled "Track gate pipeline" with body "Implement deterministic policy"
    And I create an intent for "policy.txt" with content "gate\n" as "text/plain"
    And "bob" signs a review "approved" on the intent with body "policy is deterministic"
    And "ci-bot" records CI "unit" as "passed" for the intent
    Then the collaboration projection contains issue "Track gate pipeline"
    And the gate status for the intent requiring review "approved" and CI "unit" passes

  @persona.github_open_source_contributor
  Scenario: Repositories synchronize through an explicit memory transport
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And a peer Epoch repository initialized as "bob"
    When I record "note.txt" with content "hello\n" as "text/plain"
    And I sync to the peer through a memory transport
    Then the peer repository verifies successfully
    And the peer recorded blob content equals "hello\n"

  @persona.github_open_source_contributor
  Scenario: Reusable conflict resolutions are signed and exact-match only
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I record a reusable conflict resolution for "config.json" as "application/json"
      | base         | left         | right        | resolved      |
      | {"flag":0}   | {"flag":1}   | {"flag":2}   | {"flag":3}    |
    Then the repository reuses the conflict resolution for "config.json" as "application/json"
      | base         | left         | right        |
      | {"flag":0}   | {"flag":1}   | {"flag":2}   |
    And the reusable conflict resolution equals JSON:
      """
      {"flag":3}
      """

  @persona.github_open_source_contributor
  Scenario: CLI records and reuses exact-match conflict resolutions
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    And I write raw workspace file "base.json" with content "{\"flag\":0}\n"
    And I write raw workspace file "left.json" with content "{\"flag\":1}\n"
    And I write raw workspace file "right.json" with content "{\"flag\":2}\n"
    And I write raw workspace file "resolved.json" with content "{\"flag\":3}\n"
    And I run the Epoch CLI with arguments:
      | resolve             |
      | --type              |
      | application/json    |
      | --path              |
      | config.json         |
      | --record-resolution |
      | resolved.json       |
      | base.json           |
      | left.json           |
      | right.json          |
    Then the CLI exits with code 0
    When I run the Epoch CLI with arguments:
      | resolve          |
      | --type           |
      | application/json |
      | --path           |
      | config.json      |
      | base.json        |
      | left.json        |
      | right.json       |
    Then the CLI output contains "\"flag\": 3"

  @persona.github_open_source_contributor
  Scenario: Operation events explain repository command history
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    When I append an operation event for command "checkout review" with status "succeeded"
    Then the operation event log contains command "checkout review" with status "succeeded"

  @persona.github_open_source_contributor
  Scenario: Media-aware entity adapters merge tabular CSV by row identity
    Given the default CRDT registry
    When I merge text/csv values:
      | base                 | left                         | right                        |
      | id,name\n1,Alice\n   | id,name\n1,Alice\n2,Bob\n   | id,name\n1,Alice\n3,Carol\n |
    Then the merged text equals "id,name\n1,Alice\n2,Bob\n3,Carol\n"

  @persona.github_open_source_contributor
  Scenario: Redaction events allow local secret cleanup without losing audit evidence
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "secret.txt" with content "token\n" as "text/plain"
    When I redact the last recorded blob with reason "secret committed"
    And I remove the redacted blob from local storage
    Then the repository verifies successfully
    And the redaction projection contains reason "secret committed"

  @persona.github_open_source_contributor
  Scenario: Event serialization can be substituted by repository providers
    Given a new workspace
    When I initialize an Epoch repository with custom "toon" serialization as "alice"
    And I record "note.txt" with content "hello\n" as "text/plain"
    Then the repository verifies successfully
    And serialized event files use extension ".toon"

  @persona.github_open_source_contributor
  Scenario: CLI exposes collaboration, gate, operation, and redaction workflows
    Given a new workspace
    When I run the Epoch CLI with arguments:
      | init     |
      | --author |
      | alice    |
    And I run the Epoch CLI with arguments:
      | issue       |
      | --title     |
      | Track gates |
      | Gate body   |
    Then the CLI output contains "collaboration.issue"
    When I write raw workspace file "gate.txt" with content "gate\n"
    And I run the Epoch CLI with arguments:
      | intent     |
      | --type     |
      | text/plain |
      | gate.txt   |
    And I remember the CLI output as "intent"
    And I run the Epoch CLI with remembered argument "intent":
      | review   |
      | --state  |
      | approved |
      | --body   |
      | ok       |
      | --author |
      | bob      |
    And I run the Epoch CLI with remembered argument "intent":
      | ci-record |
      | --name    |
      | unit      |
      | --status  |
      | passed    |
      | --author  |
      | ci-bot    |
    And I run the Epoch CLI with remembered argument "intent":
      | gate-status |
      | --review    |
      | approved    |
      | --ci        |
      | unit        |
    Then the CLI output contains "gate passed"
    When I run the Epoch CLI with arguments:
      | op-log |
    Then the CLI output contains "intent"
    And I record "secret.txt" with content "token\n" as "text/plain"
    When I redact the last recorded blob with reason "secret committed"
    And I run the Epoch CLI with arguments:
      | redact-plan       |
      | __LAST_BLOB_HASH__ |
    Then the CLI output contains "affectedEvents"
