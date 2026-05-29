@competition @ai_agent @persona.github_open_source_contributor
Feature: Multi-agent Codex session supervision
  OpenAI Codex differentiates by giving a contributor one command center for
  local, cloud, and review-oriented coding agents.

  Scenario: Contributor delegates parallel fixes and reviews agent changes
    Given a GitHub open-source contributor has a repository connected to Codex
    And the contributor has local Codex configuration and project instructions
    When the contributor starts separate Codex tasks for a bug fix and documentation update
    Then Codex runs the tasks in isolated agent workspaces or worktrees
    And the contributor can switch between task threads without losing context
    When an agent proposes code changes
    Then the contributor can inspect the diff, comment on the result, and open the work locally
    And the accepted work can move toward a pull request or local commit for human review

  Scenario: Maintainer uses Codex code review before merging
    Given a maintainer has enabled Codex code review for a repository
    When a contributor opens a pull request
    Then Codex inspects the change with repository context and review guidance
    And the maintainer receives automated findings before final approval
    But the maintainer still needs durable project records for what Codex inspected, what it skipped, and which policy was trusted
