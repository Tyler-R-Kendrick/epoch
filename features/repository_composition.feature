Feature: Repository composition and workspace selection
  Contributors working in a large repository want only the part of it they are
  responsible for, and maintainers want to embed a component that another team
  owns without absorbing its history. Selection answers "which resources are
  relevant to me", Repository Links answer "who owns this path", and the two stay
  separately answerable so a missing file always has one clear explanation.

  @persona.github_open_source_contributor
  Scenario: A contributor narrows their workspace to the component they work on
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "apps/api/main.ts" with content "api\n" as "text/plain"
    And I record "apps/web/main.ts" with content "web\n" as "text/plain"
    And I delete workspace file "apps/web/main.ts"
    When I run the Epoch CLI with arguments:
      | workspace |
      | select    |
      | set       |
      | apps/api  |
    And I run the Epoch CLI with arguments:
      | checkout          |
      | --materialization |
      | eager             |
      | main              |
    Then the CLI output contains "excluded=1"
    And workspace file "apps/api/main.ts" contains "api\n"
    And workspace file "apps/web/main.ts" does not exist

  @persona.github_open_source_contributor
  Scenario: A contributor asks why a file is not in their working tree
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "apps/api/main.ts" with content "api\n" as "text/plain"
    And I record "apps/web/main.ts" with content "web\n" as "text/plain"
    And I run the Epoch CLI with arguments:
      | workspace |
      | select    |
      | set       |
      | apps/api  |
    When I run the Epoch CLI with arguments:
      | workspace        |
      | select           |
      | explain          |
      | apps/web/main.ts |
    Then the CLI output contains "excluded"
    And the CLI output contains "add the path to the workspace selection"

  @persona.github_open_source_contributor
  Scenario: A contributor sees how much of the repository their selection covers
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "apps/api/main.ts" with content "api\n" as "text/plain"
    And I record "apps/web/main.ts" with content "web\n" as "text/plain"
    And I run the Epoch CLI with arguments:
      | workspace |
      | select    |
      | set       |
      | apps/api  |
    When I run the Epoch CLI with arguments:
      | workspace |
      | select    |
      | show      |
    Then the CLI output contains "apps/api/main.ts"
    And the CLI output contains "\"excluded\":1"

  @persona.maintainer
  Scenario: A maintainer embeds a component another team owns
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "app.ts" with content "app\n" as "text/plain"
    When I run the Epoch CLI with arguments:
      | component                                                        |
      | link                                                             |
      | vendor/parser                                                    |
      | link-parser                                                      |
      | --repository-id                                                  |
      | repo:parser                                                      |
      | --version-id                                                     |
      | version:1                                                        |
      | --namespace-root                                                 |
      | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd |
    And I run the Epoch CLI with arguments:
      | component |
      | list      |
    Then the CLI output contains "vendor/parser"
    And the CLI output contains "version:1"

  @persona.maintainer
  Scenario: A maintainer is stopped from mounting a component inside another one
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "app.ts" with content "app\n" as "text/plain"
    And I run the Epoch CLI with arguments:
      | component                                                        |
      | link                                                             |
      | vendor/parser                                                    |
      | link-parser                                                      |
      | --repository-id                                                  |
      | repo:parser                                                      |
      | --version-id                                                     |
      | version:1                                                        |
      | --namespace-root                                                 |
      | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd |
    When I run the Epoch CLI with arguments:
      | component                                                        |
      | link                                                             |
      | vendor/parser/inner                                              |
      | link-inner                                                       |
      | --repository-id                                                  |
      | repo:other                                                       |
      | --version-id                                                     |
      | version:1                                                        |
      | --namespace-root                                                 |
      | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd |
    Then the CLI error contains "mounts overlap"

  @persona.maintainer
  Scenario: A maintainer sees that a linked component's content is not available locally
    Given a new workspace
    And I initialize an Epoch repository as "alice"
    And I record "app.ts" with content "app\n" as "text/plain"
    And I run the Epoch CLI with arguments:
      | component                                                        |
      | link                                                             |
      | vendor/parser                                                    |
      | link-parser                                                      |
      | --repository-id                                                  |
      | repo:parser                                                      |
      | --version-id                                                     |
      | version:1                                                        |
      | --namespace-root                                                 |
      | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd |
    When I run the Epoch CLI with arguments:
      | component |
      | verify    |
    Then the CLI output contains "unavailable"
