@competitor @block-buzz @ai-native
Feature: Work room colocates conversation and change evidence
  As a Buzz power user
  I want a feature branch or work item to live as a room
  So that patches, CI, review, and merge decisions share one record

  Scenario: Branch channel holds discussion and change artifacts
    Given a feature branch is linked to a channel
    When patches, CI results, and review comments land
    Then they appear in the same room as human discussion
    And a later reader can reconstruct why the change exists without leaving the room

  Scenario: Merge decision is part of the room log
    Given review is complete in the work room
    When the merge decision is recorded
    Then the decision is visible alongside the evidence that produced it
