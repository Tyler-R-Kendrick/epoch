@competition @ostree
Feature: Content-addressed tree deltas
  OSTree versions complete filesystem trees as whole-file content-addressed objects
  checksummed with SHA-256, distributes updates as precomputed static deltas or by
  fetching missing objects, and garbage-collects objects unreachable from refs.
  It is the loose-object plus static-delta counterpoint to Epoch's sub-file chunking.

  Scenario: Committing a filesystem tree into content-addressed objects
    Given a filesystem tree with regular files, directories, and metadata
    When OSTree commits the tree into its object store
    Then each file becomes a whole-file object with canonical uid/gid/mode/xattrs metadata
    And dirtree, dirmeta, and commit objects are checksummed with SHA-256
    And a ref is updated to point at the new commit

  Scenario: A client updates via a static delta or fetches missing objects
    Given a client on an older commit and a server hosting a newer commit
    When a precomputed static delta between the two commits is available
    Then the client downloads the compact delta instead of many loose objects
    And without a delta the client fetches only the missing objects over dumb HTTP

  Scenario: Pruning objects unreachable from refs
    Given a repository whose refs are the garbage-collection roots
    When ostree prune runs
    Then objects reachable from a ref are retained
    And objects no longer reachable from any ref are deleted
