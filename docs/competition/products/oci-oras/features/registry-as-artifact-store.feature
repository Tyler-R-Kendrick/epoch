@competition @oci-oras
Feature: Registry as artifact store
  An OCI registry stores content-addressed blobs and manifests over an HTTP API, and ORAS
  pushes and pulls arbitrary artifacts (not just container images) addressed by digest.
  Range GET and zstd:chunked add ranged, resumable, and partial fetch on commodity infrastructure.
  It is a candidate substrate for Epoch's ADR-0015 Option 11 external-pointer descriptor.

  Scenario: Pushing an arbitrary artifact as OCI blobs and a manifest
    Given a file that is not a container image
    When ORAS pushes it to an OCI-compliant registry
    Then the bytes are stored as one or more blobs addressed by sha256 digest
    And a manifest records the blob digests and their media types
    And a mutable tag points at the manifest digest while pull-by-digest stays immutable

  Scenario: Pulling by digest with a ranged, resumable fetch
    Given a manifest and its blobs stored in the registry
    When a client requests a blob by digest using an HTTP Range GET
    Then the registry serves the requested byte range
    And an interrupted download resumes from the last received range
    And the client verifies the assembled bytes against the sha256 digest

  Scenario: zstd:chunked partial pull of only missing chunks
    Given a layer in zstd:chunked format carrying a table of chunk offsets and digests
    And a client that already holds some of those chunks from other layers
    When the client pulls the layer
    Then it fetches only the chunks whose digests it is missing
    And it reconstructs the layer contents and validates them against the chunk and layer digests
