@competition @persona.github_open_source_contributor
Feature: Mobile app-store launch in Rork
  Rork differentiates by focusing AI generation on native mobile launch rather than only web prototypes.

  Scenario: Founder builds and prepares a native mobile app for launch
    Given a founder has an app idea but no local mobile build environment
    When the founder describes the mobile app in Rork's browser prompt
    And Rork generates the app structure, screens, and implementation
    And the founder tests the app on a device and adds monetization or backend integrations
    And the founder syncs the project to GitHub for technical review
    Then the founder can prepare the app for App Store or Play Store publishing
    And the team can decide what release evidence, privacy disclosures, and store-review artifacts still need hardening
