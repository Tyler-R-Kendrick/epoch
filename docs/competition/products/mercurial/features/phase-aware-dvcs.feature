@competition @mercurial
Feature: Mercurial phase-aware distributed version control
  Mercurial differentiates by combining distributed history with simpler commands and sharing-aware changeset phases.

  Scenario: Developer commits and shares a draft changeset
    Given a developer has cloned a Mercurial repository
    When they edit files, add them, commit a changeset, and push to a publishing server
    Then the local workflow remains mostly offline until push
    And the pushed changeset becomes public according to phase rules

  Scenario: Phase prevents accidental rewrite of public history
    Given a changeset is in the public phase
    When a user tries to rewrite it with history-editing tooling
    Then Mercurial refuses the unsafe operation by default
    And the user must make an explicit phase decision before changing shared history

  Scenario: Ecosystem mismatch limits collaboration adoption
    Given a team uses GitHub, GitLab, or Bitbucket for review and automation
    When they consider Mercurial for a simpler DVCS model
    Then they must account for weaker mainstream forge, CI, and hiring familiarity
    And the operational switching cost can outweigh Mercurial's command-line advantages

