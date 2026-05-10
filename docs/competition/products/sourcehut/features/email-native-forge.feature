@competition @sourcehut @mailing_lists @no_javascript
Feature: Email-native forge with scriptable project services
  SourceHut composes Git or Mercurial hosting, mailing lists, builds, tickets, and pages
  so maintainers can run open-source projects with fast, textual, low-JavaScript workflows.

  Scenario: Maintainer reviews a patch from a mailing list
    Given a project uses SourceHut lists for patch review
    And a contributor sends a patch series by email
    When the maintainer reviews the threaded discussion
    Then the patch remains tied to the mailing-list archive
    And project discussion stays available without requiring a JavaScript-heavy review UI

  Scenario: Build validates repository changes
    Given a repository contains a SourceHut build manifest
    When a change triggers builds.sr.ht
    Then SourceHut boots a virtualized worker
    And the configured tasks validate, package, or deploy the project

  Scenario: User exports project data
    Given a maintainer wants to leave hosted SourceHut or back up project state
    When the maintainer uses the hut CLI export workflow
    Then repositories and service data can be copied out
    And the project is less dependent on one hosted tenant
