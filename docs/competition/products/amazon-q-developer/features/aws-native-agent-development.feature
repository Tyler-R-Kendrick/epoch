@competition @ai_agent @persona.platform_operator
Feature: AWS-native agent development and review
  Amazon Q Developer differentiates by attaching coding assistance to AWS
  identity, GitHub repository workflows, and modernization tasks.

  Scenario: Platform operator delegates an issue to the GitHub development agent
    Given a platform operator has installed the Amazon Q Developer GitHub app on selected repositories
    And the repository has the Amazon Q development agent label available
    When the operator labels a GitHub issue for Q development
    Then Amazon Q analyzes the repository and proposes an implementation plan
    And Amazon Q creates a pull request with generated changes and a summary
    When the operator reviews the pull request
    Then the operator can request iteration with Q comments before deciding whether to merge
    And the team still needs independent records of the accepted plan, review basis, and final provenance

  Scenario: Maintainer runs an IDE code review before accepting generated work
    Given a maintainer has Amazon Q installed in a supported IDE
    When the maintainer asks Q to review recent changes or the repository
    Then Q reports code quality and security findings from generative and rule-based detectors
    And the maintainer can inspect suggested fixes before applying them
    But accepted fixes need repository-native evidence beyond the IDE chat transcript
