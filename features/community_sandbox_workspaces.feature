Feature: Community sandbox workspaces
  Contributors with limited time use community-hosted sandbox workspaces to safely change a repository without local setup, then maintainers review the signed result.

  @persona.github_open_source_contributor
  Scenario: Contributor submits a repository patch without local setup
    Given a GitHub open-source contributor named "Alex" opens repository "epoch-community"
    When Alex opens the repository workspace templates
    And Alex selects workspace template "Contributor workspace"
    And Alex reviews cost owner "community compute pool" and security policy "no repository secrets"
    And Alex launches a sandbox workspace for "Add regional revenue chart"
    And Alex changes "src/dashboard/RegionRevenue.tsx" in the workspace
    And Alex runs checks for the workspace
    And Alex submits the workspace as patch intent "intent-region-revenue"
    Then Alex has a submitted sandbox workspace for "Add regional revenue chart"
    And patch intent "intent-region-revenue" includes changed file "src/dashboard/RegionRevenue.tsx"
    And the workspace keeps signed provenance for "intent-region-revenue"
    And Alex can leave the workspace without losing context

  @persona.github_open_source_contributor
  Scenario: Contributor resumes an interrupted sandbox workspace
    Given a GitHub open-source contributor named "Alex" has an interrupted sandbox workspace "workspace-region-revenue" for repository "epoch-community"
    When Alex returns to the repository workspace list
    And Alex resumes the sandbox workspace
    Then sandbox workspace "workspace-region-revenue" is ready to continue
    And the workspace still has agent context "project norms and prior terminal history"
    And the workspace explains recovery state "resumed from signed workspace snapshot"
    And Alex can continue with workspace action "Run Checks"

  @persona.maintainer
  Scenario: Maintainer approves a submitted sandbox workspace result
    Given maintainer "Maya" has a submitted sandbox workspace "workspace-region-revenue" with patch intent "intent-region-revenue"
    When Maya opens the workspace review queue
    And Maya reviews changed file "src/dashboard/RegionRevenue.tsx"
    And Maya reviews passing checks for the workspace
    And Maya approves the patch intent
    Then patch intent "intent-region-revenue" is approved by "maya"
    And the review includes preview "preview-region-revenue"
    And the review keeps signed provenance "event-review-region-revenue"
