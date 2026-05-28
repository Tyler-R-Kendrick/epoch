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

  Scenario Outline: Executable feature specs are mapped to personas and human considerations
    When an agent audits the executable feature spec "<feature spec>"
    Then the persona feature matrix documents "<feature spec>"
    And the persona feature matrix maps "<feature spec>" to persona "<persona>"
    And the persona feature matrix captures pain point "<pain point>"
    And the persona feature matrix captures human consideration "<human consideration>"

    Examples:
      | feature spec                                      | persona                           | pain point                                | human consideration |
      | features/repository.feature                       | A GitHub open-source contributor  | Trusting Current State                    | portability         |
      | features/actors.feature                           | A GitHub open-source contributor  | Trusting Current State                    | identity            |
      | features/crdt_log.feature                         | A GitHub open-source contributor  | Preserving Agency And Portability         | degraded state      |
      | features/merge.feature                            | A GitHub open-source contributor  | Reducing Maintainer And Contributor Burnout | trust             |
      | features/named_views.feature                      | A GitHub open-source contributor  | Preserving Agency And Portability         | rollback            |
      | features/cli_wasm.feature                         | A GitHub open-source contributor  | Preserving Agency And Portability         | accessibility       |
      | features/wasm_react.feature                       | A GitHub open-source contributor  | Preserving Agency And Portability         | interrupted session |
      | features/ha_dr.feature                            | A GitHub open-source contributor  | Trusting Current State                    | recovery            |
      | features/advanced_collaboration.feature           | A GitHub open-source contributor  | Protecting Contributor Security           | privacy             |
      | features/platform_core.feature                     | A platform operator               | Trusting Current State                    | governance          |
      | features/platform_operations.feature               | A platform operator               | Avoiding Surprise Cost                    | auditability        |
      | features/platform_product_domains.feature          | A maintainer                      | Reducing Maintainer And Contributor Burnout | moderation        |
      | features/platform_enterprise_conformance.feature   | A security and compliance responder | Protecting Contributor Security         | compliance          |
      | features/platform_infrastructure_delivery.feature  | A platform operator               | Avoiding Surprise Cost                    | cost                |
      | features/platform_ai_operations_ha.feature         | A platform operator               | Protecting Contributor Security           | AI governance       |
      | features/platform_community_conformance.feature    | A maintainer                      | Reducing Maintainer And Contributor Burnout | moderation        |
      | features/platform_web.feature                      | A platform operator               | Trusting Current State                    | accessibility       |
      | features/platform_web_conformance.feature          | A platform operator               | Trusting Current State                    | accessibility       |
      | features/community_persona_driven_design.feature   | A GitHub open-source contributor  | Trusting Current State                    | human-centered design |
      | features/platform_projects.feature                 | A GitHub open-source contributor  | Preserving Agency And Portability         | portability         |

  Scenario: Persona feature mapping catches undocumented executable specs
    When an agent audits the repository feature inventory
    Then every executable feature spec is documented in the feature registry
    And every executable feature spec is documented in the persona feature matrix
    And every executable feature spec carries a persona-driven rule

  Scenario: Persona journeys cover documented and undocumented feature behavior end to end
    When an agent audits the repository feature inventory
    Then every documented persona has an executable end-to-end journey
    And every executable feature spec is covered by a persona end-to-end journey
  Rule: Persona-driven feature acceptance
    Scenario Outline: Persona context for community_persona_driven_design.feature
      Given the Community human-centered design guidance is available
      When an agent audits the executable feature spec "<feature spec>"
      Then the persona feature matrix maps "<feature spec>" to persona "<persona>"
      And the persona feature matrix captures pain point "<pain point>"
      And the persona feature matrix captures human consideration "<human consideration>"

      Examples:
        | feature spec   | persona   | pain point   | human consideration   | journey   |
        | features/community_persona_driven_design.feature | A GitHub open-source contributor | Trusting Current State | human-centered design | keep Community decisions anchored in persona scenarios before implementation |
