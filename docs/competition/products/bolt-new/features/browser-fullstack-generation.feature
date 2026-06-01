@competition @ai-agent @bolt-new @browser-runtime
Feature: Browser full-stack app generation
  Bolt.new combines prompt-driven app generation with a runnable browser development environment.

  Background:
    Given a builder opens Bolt.new in a browser
    And the builder wants to create or modify a JavaScript web app without local setup

  Scenario: Generating a runnable app in the browser
    Given the builder describes the app they want
    When Bolt generates files and installs dependencies
    Then the builder can inspect code, see terminal output, and interact with the live preview
    And the builder can ask Bolt to fix runtime errors in the same workspace

  Scenario: Opening an existing public repository
    Given the builder has a public GitHub repository
    When the builder opens the repository through a Bolt URL
    Then Bolt loads the project in the browser workspace
    And the builder can continue prompting, editing, and previewing from that imported source

  Scenario: Epoch signs browser-workspace evidence
    Given Bolt has generated files, installed packages, run commands, and shown a preview
    When the builder exports, syncs, or deploys the result
    Then Epoch should record prompts, generated file hashes, package changes, terminal output, preview URL, sync action, and deployment target as signed provenance
