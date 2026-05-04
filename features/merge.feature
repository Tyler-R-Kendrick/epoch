Feature: Entity-level CRDT merging
  Epoch merges registered entity types without line-level conflict markers.

  Scenario: Merge concurrent text additions
    Given the default CRDT registry
    When I merge text/plain values:
      | base   | left         | right         |
      | base\n | base\nleft\n | base\nright\n |
    Then the merged text contains "left"
    And the merged text contains "right"

  Scenario: Merge text additions without dropping repeated lines
    Given the default CRDT registry
    When I merge text/plain values:
      | base     | left              | right             |
      | item\n   | item\nagain\nagain\n | item\nright\n |
    Then the merged text equals "item\nagain\nagain\nright\n"

  Scenario: Merge text without dropping repeated base lines
    Given the default CRDT registry
    When I merge text/plain values:
      | base       | left             | right              |
      | item\nitem\n | item\nitem\nleft\n | item\nitem\nright\n |
    Then the merged text equals "item\nitem\nleft\nright\n"

  Scenario: Merge text additions at their original positions
    Given the default CRDT registry
    When I merge text/plain values:
      | base       | left             | right              |
      | top\nend\n | top\nmiddle\nend\n | top\nend\ntail\n |
    Then the merged text equals "top\nmiddle\nend\ntail\n"

  Scenario: Merge independent JSON object keys
    Given the default CRDT registry
    When I merge application/json values:
      | base             | left                         | right                         |
      | {"name":"epoch"} | {"name":"epoch","left":true} | {"name":"epoch","right":true} |
    Then the merged JSON equals:
      """
      {"left":true,"name":"epoch","right":true}
      """

  Scenario: Report conflicting JSON scalar edits
    Given the default CRDT registry
    When I merge application/json values:
      | base          | left          | right         |
      | {"count": 1}  | {"count": 2}  | {"count": 3}  |
    Then the merge reports a conflict containing "count"
