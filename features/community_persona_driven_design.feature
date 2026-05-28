Feature: Epoch Community persona-driven BDD
  Epoch Community development is driven by documented personas and human-centered
  scenarios before implementation details are chosen.

  Background:
    Given the Community human-centered design guidance is available
    And the default Community persona is "A GitHub open-source contributor"

  Scenario: Community work starts from persona scenarios
    When an agent plans a Community feature change
    Then the Community BDD contract requires a persona-driven Gherkin scenario
    And the scenario must name the contributor journey, pain point, trust question, degraded-state behavior, and validation evidence
    And the repository instructions require Community changes to update persona-driven feature scenarios

  Scenario: Community methodology combines design thinking, user-centric design, and human-centered design
    When an agent plans a Community feature change
    Then the Community BDD contract requires methodology "design thinking"
    And the Community BDD contract requires methodology "user-centric design"
    And the Community BDD contract requires methodology "human-centered design"
    And the Community design-thinking loop covers stage "Discover"
    And the Community design-thinking loop covers stage "Define"
    And the Community design-thinking loop covers stage "Ideate"
    And the Community design-thinking loop covers stage "Prototype"
    And the Community design-thinking loop covers stage "Validate"
    And the Community design-thinking loop covers stage "Learn"

  Scenario: Contributor trust and degraded availability are explicit
    When the persona is trying to judge current repository state during degraded hosted-service availability
    Then the Community scenario catalog covers pain point "Trusting Current State"
    And the Community scenario catalog covers human consideration "degraded state"
    And the Community scenario catalog covers human consideration "provider-reported availability"
    And the Community scenario catalog covers recovery option "continue locally"

  Scenario: Contributor security and secret-risk decisions are explicit
    When the persona is deciding whether to trust editor, workflow, signing-key, or extension access
    Then the Community scenario catalog covers pain point "Protecting Contributor Security"
    And the Community scenario catalog covers human consideration "security"
    And the Community scenario catalog covers human consideration "privacy"
    And the Community scenario catalog covers human consideration "actionable next steps"

  Scenario: Contributor cost and AI billing decisions are explicit
    When the persona is deciding whether to run AI assistance, CI, storage, or cloud automation
    Then the Community scenario catalog covers pain point "Avoiding Surprise Cost"
    And the Community scenario catalog covers human consideration "cost"
    And the Community scenario catalog covers human consideration "quota"
    And the Community scenario catalog covers recovery option "free path"

  Scenario: Contributor moderation, accessibility, and portability are explicit
    When the persona is contributing asynchronously under community pressure
    Then the Community scenario catalog covers pain point "Reducing Maintainer And Contributor Burnout"
    And the Community scenario catalog covers pain point "Preserving Agency And Portability"
    And the Community scenario catalog covers human consideration "accessibility"
    And the Community scenario catalog covers human consideration "moderation"
    And the Community scenario catalog covers human consideration "portability"
