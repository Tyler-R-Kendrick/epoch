@competition @playstation-playgo
Feature: Chunked progressive install
  PlayStation PlayGo lets a game start from an initial chunk while remaining chunks install in the background, selected by scenario and language mask.
  All behavior here is reconstructed from reverse-engineering wikis and homebrew and is uncertain, not official.

  Scenario: Game starts from its scenario initial chunks
    Given a scenario in playgo-manifest.xml declares an initial-chunk count for a mode
    When those initial chunks are installed
    Then the game can begin that mode
    And the remaining chunks install in the background via dedicated I/O

  Scenario: Language mask selects which language chunks are resident
    Given playgo-chunk.dat carries a 64-bit language mask
    When the player selects a language
    Then only the matching language chunks are treated as required
    And non-selected language chunks are not made resident

  Scenario: Runtime reprioritization pulls forward needed chunks
    Given the player is progressing through the game
    When the game reprioritizes chunk install order via the PlayGo API
    Then chunks the player is about to need are fetched sooner
    And progress and ETA can be queried while installation continues
