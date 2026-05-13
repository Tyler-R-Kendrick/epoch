@competition @gitkraken @visual_git @multi_repo
Feature: Visual Git workspace
  GitKraken gives developers a visual workspace for repository history, PR status,
  issues, and multi-repository actions so they can coordinate work without
  switching between hosting tabs and terminal commands.

  Scenario: Developer reviews history through the commit graph
    Given a repository has multiple active branches and recent commits
    When the developer opens the repository in GitKraken Desktop
    Then the commit graph shows branch structure, commit messages, authors, and change size
    And the developer can open contextual actions for a selected commit or branch

  Scenario: Team lead monitors multi-repo pull request readiness
    Given a cloud workspace contains repositories connected to GitHub and Jira
    When the team lead opens Launchpad in team view
    Then pull requests, issues, reviewers, build status, and WIP are visible in one dashboard
    And the team lead can filter by repository, assignee, sprint, or status

  Scenario: New teammate clones a shared workspace
    Given a team has published a workspace with required repositories
    When a new teammate joins the workspace
    Then they can clone or open the repository set from one shared configuration
    And they inherit enough repository context to start work without manual repo discovery
