@competition @ai-agent @lovable @prompt-to-app
Feature: Full-stack app generation with GitHub sync
  Lovable turns a product prompt into a hosted app while giving teams a GitHub escape path.

  Background:
    Given a founder or product team starts a Lovable project
    And the project may later need developer collaboration and independent deployment

  Scenario: Generating and publishing an app
    Given the builder describes the product flow in natural language
    When Lovable generates the app UI and connected backend behavior
    Then the builder can preview, revise, and publish the app from Lovable
    And paid plans can attach a custom domain and remove builder branding

  Scenario: Connecting the generated app to GitHub
    Given the project owner wants code backup and developer collaboration
    When the owner connects a workspace GitHub account and links the project
    Then Lovable creates or connects a repository
    And Lovable syncs edits from the active GitHub branch back into the project

  Scenario: Epoch signs prompt-to-repository provenance
    Given Lovable has generated code, backend changes, preview state, and GitHub commits
    When a team accepts the app as production work
    Then Epoch should record the prompt, generated blueprint, changed files, backend intent, branch, commit attribution, deployment URL, and reviewer approval as signed evidence
