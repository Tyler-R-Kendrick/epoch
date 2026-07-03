@competition @ipfs
Feature: Content-addressed block exchange
  IPFS chunks content into a Merkle DAG addressed by self-verifying CIDs and exchanges
  blocks peer-to-peer via Bitswap and a DHT provider index.
  It demonstrates both content addressing and the gap between addressing and availability.

  Scenario: Adding content produces a deterministic self-verifying CID
    Given a file is chunked into a Merkle DAG using default settings
    When each DAG node is hashed into a CID of multicodec plus multihash
    Then identical content with identical settings yields the same CID
    And a fetched block can be verified against its CID without trusting the sender

  Scenario: Fetching a block by CID via Bitswap and the DHT
    Given a client knows the CID of content it wants
    When the client queries the DHT for provider records and sends Bitswap want-lists
    Then peers holding the block return it and the client verifies it against the CID
    And identical blocks are deduplicated across the DAG by construction

  Scenario: Valid CID resolves to nothing after content is unpinned
    Given content that was added but never pinned by any hosting node
    When garbage collection removes the unpinned blocks
    And provider records for the CID expire without reprovision
    Then a client with a valid CID can no longer retrieve the content
    And the case shows that content addressing does not guarantee availability
