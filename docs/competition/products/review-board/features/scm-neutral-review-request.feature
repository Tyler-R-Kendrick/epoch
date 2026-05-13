@competition @review_board @code_review @multi_scm
Feature: SCM-neutral review request
  Review Board lets teams review changes from multiple repository systems
  so review evidence is not locked to a single Git forge.

  Scenario: Developer posts a change for review
    Given a repository is configured in Review Board
    And a developer has a local change set
    When the developer creates a review request with a diff
    Then reviewers can inspect the changed files in the diff viewer
    And the review request tracks comments, open issues, and approval state

  Scenario: Reviewer comments on a screenshot or attachment
    Given a review request includes a screenshot or file attachment
    When a reviewer selects a region and writes feedback
    Then Review Board records the comment near the visual artifact
    And the review request keeps that feedback with the code discussion

  Scenario: Team reviews across more than one SCM
    Given an organization uses Git and a legacy SCM
    When administrators configure both repository backends
    Then teams can use a common review request workflow
    And the review history remains visible outside each individual SCM tool
