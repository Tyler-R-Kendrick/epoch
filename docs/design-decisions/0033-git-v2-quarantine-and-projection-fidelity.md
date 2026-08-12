# ADR-0033: Git Protocol V2, Quarantine, And Projection Fidelity

Status: Accepted and implemented as a bounded compatibility profile

## Context

Git interoperability must preserve exact Git object semantics without making a
Git worktree or remote ref authoritative over Epoch history.

## Decision

- `epoch.git-projection/v1` deterministically builds SHA-1 blobs, trees, and
  commits from explicit modes, byte-sorted names, parent order, identities,
  timestamps, time zones, messages, and notes. Manifests contain no absolute
  paths.
- Git receives stage objects in quarantine, verify object framing/OIDs and
  policy, then promote. Rejected objects never become canonical.
- Smart HTTP forwards the validated `Git-Protocol` header as `GIT_PROTOCOL`.
  The advertised profile is a protocol-v2 subset. `filter` is advertised only
  when a promisor is configured and tested.
- Custom Epoch refs and notes preserve mappings; graph ingest reports losses
  for signed-commit attestations, submodules, and replace refs.
- jj, Graphite, GitButler, Mercurial, and Sapling helpers are declared mapping
  profiles, not native implementations.

## Compatibility And Escape

Existing Git import/export and smart HTTP remain. Rebuild deletes only the
regenerable projection, never Epoch events. Users can clone the Git projection
or export it and stop using the proxy. Git SHA-256 object format, Mercurial
phases/evolve/native wire, Sapling native wire, and filter without promisor are
unsupported.

## Consequences

Git is a deterministic projection and migration boundary. Git protocol v2 and
partial-clone behavior follow advertised capabilities, not version-specific
claims. Epoch does not claim full Git server conformance.

## Revisit Criteria

Revisit after authenticated private-ref advertisement, Git SHA-256 golden
vectors, or full promisor backfill are implemented and tested.

## Related

- [Git Compatibility Proxy](../git-compatibility-proxy.md)
- [ADR-0021](0021-git-projection-and-live-migration.md)
- [Git protocol v2](https://git-scm.com/docs/protocol-v2)
- [Git partial clone](https://git-scm.com/docs/partial-clone)
