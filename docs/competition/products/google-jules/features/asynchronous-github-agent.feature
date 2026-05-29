@competition @ai_agent @persona.github_open_source_contributor
Feature: Asynchronous Jules GitHub task
  Google Jules differentiates by turning ordinary GitHub maintenance work into
  an asynchronous cloud-agent branch and pull-request flow.

  Scenario: Contributor assigns a maintenance task to Jules
    Given a GitHub open-source contributor has connected a repository to Jules
    And the contributor has selected a branch for a maintenance task
    When the contributor describes a dependency bump or labels a GitHub issue for Jules
    Then Jules clones the repository into a Cloud VM
    And Jules presents a plan for the contributor to review
    When the contributor approves the plan
    Then Jules edits the code, runs available checks, and displays a diff
    And the contributor can publish the branch or open a pull request on GitHub

  Scenario: Maintainer reviews an async Jules result
    Given a maintainer receives a Jules-created branch
    When the maintainer inspects the diff and task notes
    Then the maintainer can decide whether the change is safe to merge
    But the maintainer still needs repository-native evidence for the plan, checks, and provenance after the Jules task UI is no longer in view
