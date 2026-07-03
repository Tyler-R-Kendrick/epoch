@competition @xbox-series-x
Feature: Streaming install and intelligent delivery
  Xbox Series X|S guarantees a declared launch chunk on disk before a title is launchable, then streams the rest while verifying each data block against a signed SHA-256 hash tree.
  Intelligent Delivery installs only the chunks a specific console and locale need.

  Scenario: Title becomes playable after only the launch chunk installs
    Given a package declares a launch chunk as the minimum subset to start
    When the system has that launch chunk on disk
    Then the title becomes launchable
    And the remaining chunks copy in the background while the player plays

  Scenario: Streaming client verifies blocks against the signed hash tree
    Given a package has a cascading SHA-256 hash tree with a Microsoft-signed root
    When the client streams an individual data block
    Then it verifies that block up the hash tree to the signed root
    And it decrypts only the touched region using that region's key
    And it never needs to hash the entire package to trust the block

  Scenario: Intelligent Delivery installs only the chunks a console needs
    Given chunks are tagged with device and language specifiers
    When a specific console and locale request the title
    Then only chunks matching the device and language specifiers install
    And moving files between chunks under MSIXVC2 does not inflate the update size
