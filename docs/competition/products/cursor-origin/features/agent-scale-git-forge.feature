@competition @cursor-origin @git_forge @agent_first @conflict_resolution
Feature: Agent-scale Git forge for parallel machine authorship
  Cursor Origin is a Git-compatible forge designed for AI agents as the primary
  authors: many agents clone, branch, commit, rebase, and review the same
  repository simultaneously, an AI engine resolves the resulting conflicts, and
  humans approve machine-written change at a review gate rather than reading
  every diff line-by-line. Scenarios below reflect capabilities Cursor demoed or
  claimed at its 16 June 2026 Compile launch; Origin is pre-launch (waitlist,
  fall 2026) with no published docs, so these describe the stated product intent.

  Scenario: Dozens of agents commit to one repository in parallel
    Given a repository is hosted on Origin
    And many Cursor background agents are working on the same codebase at once
    When the agents clone, branch, commit, and push concurrently
    Then Origin sustains agent-scale throughput on a single repository
    And NVMe-backed file servers serve the fast path while S3 holds the source of truth
    But durable, signed, portable provenance for each agent change is not a stated guarantee

  Scenario: AI conflict-resolution engine merges overlapping agent edits
    Given two agents modified overlapping regions of the same files
    When their branches are merged on Origin
    Then Origin's AI engine analyzes each agent's modification intent
    And it completes the merge without human intervention in most cases
    But the resolution is a model decision rather than a deterministic, replayable event

  Scenario: Human approves machine-written change at a review gate
    Given an agent opened a pull request containing machine-generated changes
    And Origin surfaces agent context and a Graphite-style stacked review
    When a human reviewer approves the change at the gate
    Then the change merges at machine speed
    But whether a human meaningfully reviewed the change, versus bulk-approving it, is unresolved

  Scenario: Agent triages and fixes a failing CI build
    Given a pushed change caused a CI or build failure on Origin
    When the agentic CI auto-fix path runs
    Then an agent proposes a remediation and re-runs the pipeline
    And the fix flows back through the same review surface

  Scenario: External agent drives the forge over API and MCP
    Given a CI/CD system or external agent integrates with Origin
    When it calls Origin over the API or the Model Context Protocol
    Then it can host, read, push, and review code programmatically
    And Git-compatible clients continue to work against the same repository

  Scenario: Team weighs hosting source on a single vendor stack
    Given Origin bundles editor, review, forge, and a proprietary model under one owner
    When a team evaluates moving its source of truth to Origin
    Then it gains a vertically integrated, agent-optimized workflow
    But it accepts a custodial, closed forge with no published export, self-host, or offline path
