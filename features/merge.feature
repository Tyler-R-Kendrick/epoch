Feature: Entity-level CRDT merging
  Epoch merges registered entity types without line-level conflict markers.

  Scenario: Merge concurrent text additions
    Given the default CRDT registry
    When I merge text/plain values:
      | base   | left         | right         |
      | base\n | base\nleft\n | base\nright\n |
    Then the merged text contains "left"
    And the merged text contains "right"

  Scenario: Merge independent JSON object keys
    Given the default CRDT registry
    When I merge application/json values:
      | base             | left                         | right                         |
      | {"name":"epoch"} | {"name":"epoch","left":true} | {"name":"epoch","right":true} |
    Then the merged JSON equals:
      """
      {"left":true,"name":"epoch","right":true}
      """
