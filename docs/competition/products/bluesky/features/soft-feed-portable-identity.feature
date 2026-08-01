@competition @bluesky
Feature: Soft feed with portable identity
  Bluesky presents a calm timeline where AT handles are first-class.

  Scenario: User views the following feed
    Given a signed-in Bluesky user
    When the user opens the Following feed
    Then posts show display name, handle, and relative time
    And actions for reply, repost, and like are visible

  Scenario: User opens an author profile
    Given a post by @example.bsky.social
    When the user opens the author profile
    Then the handle and DID-backed identity are visible
    And the profile feed lists that author's posts
