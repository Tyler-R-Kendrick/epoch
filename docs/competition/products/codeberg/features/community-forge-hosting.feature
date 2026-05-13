@competition @codeberg @community_forge @forgejo
Feature: Community-hosted open-source forge
  Codeberg gives open-source projects a hosted Forgejo environment
  so maintainers can collaborate under nonprofit community governance.

  Scenario: Maintainer publishes a project
    Given a maintainer has a Codeberg account
    When the maintainer creates a repository and pushes Git history
    Then contributors can browse source, issues, pull requests, releases, and wiki pages
    And the project remains hosted under Codeberg's community-oriented service model

  Scenario: Project documents contribution and licensing
    Given an open-source project needs public contributor guidance
    When maintainers add license, README, and repository documentation
    Then visitors can inspect project terms before contributing
    And contributors can use familiar Forgejo flows to file issues or propose changes

  Scenario: Team publishes static project pages
    Given a project needs public documentation or a website
    When maintainers configure Codeberg Pages
    Then the project can publish static content near its source repository
    And the hosted forge remains the navigation point for code and community activity
