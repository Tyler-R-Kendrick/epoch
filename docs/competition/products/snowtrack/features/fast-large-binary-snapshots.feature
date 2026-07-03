@competition @snowtrack
Feature: Fast large binary snapshots
  SnowFS is a snapshot-oriented storage layer built for very large single binaries, using copy-on-write filesystems for fast local checkout.
  Benchmarks and internals below come from vendor/author sources; the hash function and chunking scheme are unverified.

  Scenario: Add a multi-gigabyte binary quickly
    Given an artist edits a multi-gigabyte Photoshop file
    When the artist runs snow add on the file
    Then SnowFS stores the snapshot into its content-addressed object store
    And the add completes markedly faster than git add on the same file
    # Vendor/author benchmark: ~4.6s vs ~20s on a 4 GB file; not independently verified

  Scenario: Checkout a previous snapshot near-instantly on a COW filesystem
    Given the repository lives on a copy-on-write filesystem such as APFS, ReFS, or Btrfs
    When the artist runs snow checkout on a previous snapshot
    Then SnowFS uses reflink or copy-on-write to materialize the file
    And the checkout completes in tens of milliseconds
    # Inferred COW/reflink mechanism; exact implementation not documented

  Scenario: Fall back on a plain filesystem
    Given the repository lives on a plain filesystem such as FAT, NTFS, or HFS+
    When the artist checks out a large binary snapshot
    Then SnowFS still materializes the correct file content
    And the operation works without copy-on-write acceleration
