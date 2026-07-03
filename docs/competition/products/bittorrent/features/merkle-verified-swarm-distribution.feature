@competition @bittorrent
Feature: Merkle-verified swarm distribution
  BitTorrent distributes content as hash-verified pieces exchanged directly between peers,
  and in v2 verifies every 16 KiB block against a per-file SHA-256 Merkle root.
  This is prior art for Epoch's content-addressed, signed-manifest chunk distribution.

  Scenario: Peer verifies a piece before sharing it onward
    Given a swarm identified by an info-hash derived from the bencoded info-dict
    And the info-dict holds the ordered piece hashes for the content
    When a peer finishes downloading a piece from another peer
    Then the peer hashes the piece and compares it to the info-dict hash
    And the peer only shares the piece onward if the hash matches

  Scenario: v2 client verifies an arbitrary block with an incremental Merkle proof
    Given a v2 torrent with a per-file SHA-256 Merkle tree over 16 KiB leaf blocks
    And only each file's Merkle root is stored in the info-dict
    When a client receives a single block and its Merkle proof
    Then the client verifies the block up to the per-file root without the whole tree
    And tampering with any block is detected at 16 KiB granularity

  Scenario: Swarm loses all seeders and content becomes unrecoverable
    Given a torrent whose content is only partly held across remaining peers
    When the last seeder leaves and no peer holds a rare piece
    Then the missing piece can never be reconstructed from the swarm
    And availability is shown to be emergent rather than guaranteed
