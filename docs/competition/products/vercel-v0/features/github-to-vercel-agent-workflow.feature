@competition @ai_app_builder @persona.frontend_engineer
Feature: GitHub-connected v0 application workflow
  v0 differentiates by turning AI-generated React and Next.js work into
  GitHub branches, commits, previews, and Vercel deployments.

  Scenario: Frontend engineer turns a v0 chat into a reviewable deployment
    Given a frontend engineer starts a v0 project for a dashboard application
    When v0 generates a React, TypeScript, Tailwind, and shadcn/ui interface
    And the engineer connects the chat to a GitHub repository
    And v0 creates a branch from main for the chat
    And each code-changing prompt is auto-committed to that branch
    And the engineer publishes the app to the connected Vercel project
    Then the team can review the branch and pull request
    And the Vercel preview reflects the generated application state
    And environment variables and integrations are available across preview and deployment

  Scenario: Team keeps generated work away from protected main
    Given a team has a protected main branch in GitHub
    When a v0 chat is connected to the repository
    Then v0 works on a dedicated branch
    And the generated changes can be reviewed before merge
    And Vercel deployments can remain linked to the Git workflow
