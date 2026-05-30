@competition @ai_agent @persona.github_open_source_contributor
Feature: Threaded Amp coding workflow
  Sourcegraph Amp differentiates by turning terminal and editor agent sessions
  into shareable threads with tools, skills, plugins, and permissions.

  Scenario: Contributor runs an agent task and shares the thread
    Given a GitHub open-source contributor is working in a repository with AGENTS.md
    And Amp is configured with project permissions and available tools
    When the contributor asks Amp to implement a multi-file change
    Then Amp uses its agent mode, tools, and repository instructions to edit the code
    And the contributor can continue, reference, or archive the thread
    When another maintainer needs context for the change
    Then the contributor can share the Amp thread for review
    But the repository still needs durable signed evidence that survives outside the Amp workspace

  Scenario: Platform team extends Amp with executable tools
    Given a platform team has repeatable project scripts for tests, generation, and checks
    When the team adds toolbox commands or plugins
    Then Amp can discover those tools and use them during agent work
    And permission rules can constrain which actions run automatically
