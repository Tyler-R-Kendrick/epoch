@competition @tahoe-lafs
Feature: Erasure-coded capability storage
  Tahoe-LAFS encrypts and erasure-codes files on the client into k-of-N shares spread
  across a grid of independent, untrusted storage servers, names them with capabilities,
  and verifies segments against Merkle roots so shares can be checked and repaired
  without decryption. It is prior art for Epoch's explicit, quantifiable availability tier.

  Scenario: Uploading a file as encrypted k-of-N shares across the grid
    Given a client with a file and a target storage grid
    When the client encrypts the file and erasure-codes it into N shares under a k-of-N scheme
    Then the shares are distributed across distinct storage servers that hold only ciphertext
    And a read-cap embedding the Merkle root hash names the file for later retrieval

  Scenario: Reconstructing a file after storage-server failures
    Given a read-cap and a grid where up to N minus k storage servers are unavailable
    When the client fetches any k surviving shares and checks them against the embedded root hash
    Then the original file is reconstructed from the k good shares
    And any corrupted or tampered share is detected and rejected before reassembly

  Scenario: Repairing shares with a verify-cap without decrypting
    Given a verify-cap for a file whose live share count has dropped below N
    When a repairer regenerates the missing shares from the surviving ones
    Then the k-of-N redundancy is restored across the grid
    And the repairer checks integrity and repairs without ever decrypting the content
