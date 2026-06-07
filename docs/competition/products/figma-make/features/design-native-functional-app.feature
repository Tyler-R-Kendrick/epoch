@competition @ai-app-builder @figma-make @design-native-generation
Feature: Design-native functional app
  Figma Make turns design context, prompts, connectors, and code packages into functional prototypes or web apps.

  Background:
    Given a designer or product manager opens Figma Make
    And the file can include frames, libraries, Make kits, code context, connectors, and Supabase data

  Scenario: Generating from a design frame and prompt
    Given the user selects a frame or starts from a prompt
    When Figma Make generates a functional prototype
    Then the user can inspect the interactive preview
    And the user can refine the result with prompts, visual edits, or code changes

  Scenario: Grounding output in a product system
    Given the team has a Make kit with npm packages, variables, styles, and guidelines
    When the user asks Make to build a product flow
    Then the generated app should follow the approved components and design rules
    And the team can publish the kit for reuse across Make projects

  Scenario: Publishing a functional web app
    Given the prototype is ready to share
    When the user opens Make settings and publishes it
    Then Figma can set metadata, access, analytics, search visibility, favicon, and social sharing state
    And the published app can be updated or unpublished later

  Scenario: Epoch signs design-to-app evidence
    Given Figma Make has used frames, prompts, connectors, model choices, Make kits, code edits, Supabase data, and publish settings
    When the prototype influences accepted product work
    Then Epoch should record source frame IDs, prompt history, connector reads, package context, generated code hashes, model selection, publish state, and follow-on repository commits as signed provenance
