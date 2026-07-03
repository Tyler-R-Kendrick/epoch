@competition @hypercore-dat
Feature: Signed append-only replication
  Hypercore is a signed append-only log whose Merkle root is Ed25519-signed on every append,
  and peers replicate only the block ranges they need, verifying each against the signed tree.
  It is close prior art for Epoch's signed-event log and targeted partial sync.

  Scenario: Owner appends a block and signs the new root
    Given a hypercore identified by a 32-byte Ed25519 public key
    And a flat in-order Merkle tree of BLAKE2b-256 block hashes
    When the key owner appends a new block
    Then the updated Merkle root is signed with the feed's private key
    And only the key owner can produce a valid extension of the log

  Scenario: Peer sparsely replicates and verifies a block range
    Given a peer knows a feed's public key but wants only a range of blocks
    When the peer requests that block range over hyperswarm
    Then the peer verifies each received block against the signed Merkle root
    And the peer never downloads the entire log to trust the range

  Scenario: Single-writer constraint forces multi-core composition
    Given two independent authors who both need to contribute
    When each author writes to their own single-writer hypercore
    Then a higher-level construct such as Autobase must merge the cores
    And multi-writer collaboration is not native to a single core
