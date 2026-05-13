@competition @gitbutler @branch_workflow @desktop_client
Feature: Virtual branch workspace
  GitButler lets a developer separate concurrent work into virtual branch lanes
  so unrelated changes can be committed, stacked, and pushed without repeated checkouts.

  Scenario: Developer separates mixed working tree changes
    Given a repository has edits for two independent tasks
    And the developer opens the repository in GitButler
    When the developer assigns files or hunks to separate virtual branches
    Then each branch lane shows only the changes for that task
    And the developer can commit each task with a focused message

  Scenario: Developer prepares reviewable stacked branches
    Given a task needs to be submitted as multiple dependent changes
    When the developer splits the work into ordered branches
    Then GitButler shows the branch stack before it is pushed
    And the developer can publish review units to the existing Git remote

  Scenario: Developer uses AI to improve commit hygiene
    Given a virtual branch has staged changes
    When the developer asks GitButler to help draft commit text
    Then the suggested message reflects the selected change set
    And the developer can edit the message before committing
