@competition @valve-steampipe
Feature: Play while downloading chunked depots
  SteamPipe splits files into fixed ~1 MiB content-addressed chunks grouped into depots, reusing existing chunks across builds so only changed regions transfer.
  It is strong at CDN-scale dedup and delta patching but weak when byte insertions shift its fixed chunk boundaries.

  Scenario: Client patches to a new build by fetching only changed chunks
    Given a client has a previous build installed with its chunks on disk
    When a new build is published with a new BuildID and manifest
    Then the client compares chunk hashes against what it already has
    And it downloads only chunks whose hashes are new
    And it reuses all unchanged chunks in place

  Scenario: Player starts a game before the full install completes
    Given a depot is ordered so the launch-critical files download first
    When enough depots and chunks are present to launch
    Then the title becomes playable while remaining chunks stream in the background
    And later content is materialized as its chunks arrive

  Scenario: Byte insertion shifts fixed chunk boundaries
    Given a developer inserts bytes near the start of a large packed file
    When SteamPipe re-chunks the file at fixed ~1 MiB boundaries
    Then every subsequent boundary shifts and most chunks get new hashes
    And the patch is far larger than the logical change unless pak boundaries were aligned to SteamPipe boundaries
