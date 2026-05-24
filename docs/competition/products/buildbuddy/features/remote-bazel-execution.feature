@competition @buildbuddy @bazel @remote_cache @remote_execution
Feature: Remote Bazel execution with shared build evidence
  BuildBuddy gives Bazel teams a shared remote cache, remote execution pool,
  and results UI so developers can accelerate builds and debug execution
  history from stable invocation records.

  Scenario: Developer runs a Bazel build against remote execution
    Given a repository is configured with BuildBuddy remote cache and execution
    When the developer runs a Bazel build with the remote configuration
    Then build actions can execute on remote workers
    And the invocation is available as a shareable BuildBuddy results link

  Scenario: Build engineer investigates a cache miss
    Given two similar invocations have different cache behavior
    When the build engineer compares invocation details and action metadata
    Then the UI shows timing, inputs, outputs, environment details, and cache statistics
    And the team can identify which changed input prevented reuse

  Scenario: Team runs a command through Remote Bazel
    Given the team wants a clean remote environment for a Bazel command
    When a developer starts a Remote Bazel run
    Then BuildBuddy provisions a runner with the requested platform and container image
    And warm workspaces or snapshots can reduce subsequent run latency
