@competition @replit_agent @ai_app_builder @checkpoints @deployments
Feature: Agent-built app with checkpoints and deployment
  Replit Agent lets users describe an app, guide the agent through changes,
  recover with checkpoints, and publish the result from the same browser
  workspace.

  Scenario: Founder asks Agent to build a web app
    Given a user starts a new Replit project
    When the user describes the application they want Agent to build
    Then Agent can plan the work, edit files, run the app, and show progress
    And Replit creates checkpoints as the application evolves

  Scenario: User recovers from a broken Agent change
    Given Agent made the app worse or changed more than expected
    When the user restores an earlier checkpoint
    Then the workspace returns to a safer application state
    And the user can continue with a narrower prompt or manual edits

  Scenario: User publishes the generated app
    Given the app runs in the Replit workspace preview
    When the user chooses a deployment type and publishes
    Then Replit creates a hosted deployment with costs deducted from credits
    And the app can be republished or adjusted as traffic needs change
