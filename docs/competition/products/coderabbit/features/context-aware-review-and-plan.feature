@competition @ai_review @persona.maintainer
Feature: CodeRabbit context-aware review and planning
  CodeRabbit differentiates by combining planning, knowledge-base context,
  pull request review, and agent handoff in the same review workflow.

  Scenario: Maintainer reviews an AI-authored pull request with repository context
    Given a maintainer receives a pull request that was produced by a coding agent
    And the repository has CodeRabbit configured with team rules and issue context
    When CodeRabbit reviews the pull request
    Then the maintainer receives a summary grounded in the diff, issue, and repository knowledge base
    And CodeRabbit flags bugs, standards violations, and missing acceptance criteria
    And the maintainer can ask follow-up questions in the pull request conversation
    When unresolved findings need implementation work
    Then the maintainer can hand the findings to Autofix or another coding agent with file paths, severity, impact, and fix direction

  Scenario: Maintainer plans work before handing it to a coding agent
    Given a maintainer has an issue or design that needs implementation
    When CodeRabbit Plan analyzes the issue and codebase
    Then it produces tasks and agent-ready prompts that reference relevant files and repository patterns
    And the maintainer can review the plan before code generation starts
