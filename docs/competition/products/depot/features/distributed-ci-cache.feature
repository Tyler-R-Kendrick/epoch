@competition @depot @ci @remote_cache @container_builds
Feature: Distributed CI cache and remote build acceleration
  Depot accelerates CI and container builds by moving work onto managed
  runners, persistent builders, and a shared remote cache that integrates
  with existing build tools.

  Scenario: Team replaces Docker build in GitHub Actions
    Given a workflow builds multi-architecture container images with Docker Buildx
    When the team switches to depot/build-push-action or `depot build`
    Then builds run on Depot-managed native builders
    And Docker layer cache persists across builds without relying on the default GitHub runner disk

  Scenario: CI job runs on a Depot GitHub Actions runner
    Given a repository is connected to Depot GitHub Actions runners
    When a workflow job uses a Depot runner label
    Then Depot launches an ephemeral single-tenant runner
    And cache storage is served by Depot's distributed cache infrastructure

  Scenario: Developer shares cache across local and CI builds
    Given a project uses a supported remote-cache-aware tool
    When the tool is configured to use Depot Cache
    Then local builds and CI builds can store and retrieve shared artifacts
    And unchanged work can be skipped across machines and workflow runs
