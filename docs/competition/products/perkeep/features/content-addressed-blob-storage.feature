@competition @perkeep
Feature: Content-addressed blob storage
  Perkeep stores everything as content-addressed blobs: large files become content
  chunks plus a small "file" schema blob (a manifest) addressed by blobref, mutable
  state evolves through GPG-signed claims over permanodes, and the search index is a
  rebuildable cache. It mirrors Epoch's content chunks, signed-event overlay, and
  regenerable caches.

  Scenario: Storing a large file as content chunks and a file-schema blob
    Given a large file uploaded to the blob server
    When Perkeep splits the file into content chunks with a rolling checksum
    Then each content chunk is stored as a content-addressed blob named by blobref
    And a small "file" schema blob records the ordered chunks as the manifest for reassembly

  Scenario: Recording a signed claim to evolve a permanode
    Given a permanode representing a durable thing in the store
    When the owner records a GPG-signed claim blob that sets an attribute on the permanode
    Then the claim is stored as an immutable content-addressed blob
    And the permanode's current state is derived by applying its signed claims in order

  Scenario: Rebuilding the search index from the blobs after loss
    Given a blob store whose separate search index has been lost or deleted
    When Perkeep re-enumerates the blobs and reindexes them
    Then the search index is fully reconstructed from the content-addressed blobs
    And the blobs remain the source of truth while the index is only a derived cache
