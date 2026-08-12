# ADR-0030: Stable Changes, Revisions, Change Graphs, Review Bundles, And Merge Plans

Status: Accepted and implemented

## Context

The pre-release proposal model could not express a stable logical Change with
multiple immutable Revisions, an explicit dependency graph, review evidence tied
to an exact frontier, or a merge plan that fails when its target moves.

## Decision

- Canonical 256-bit IDs distinguish Changes, Change Graphs, Fragments, Review
  Bundles, Merge Plans, Conflicts, Principals, and repositories. A Revision is
  identified by its signed event ID rather than a second canonical-ID kind.
- A `ChangeId` names the logical lineage; a revision names immutable content
  with explicit parent revisions and base/result tree digests.
- Change Graph edges are typed and hard dependencies are acyclic. Partial merge takes a dependency-closed
  subset. Split acceptance must reconstruct the original ordered fragments
  byte-for-byte. Squash records every source revision as provenance.
- Review bundles bind exact revisions, frontier, tree digests, conflicts, and a
  gate digest. Merge planning and application recompute closure from the supplied
  authoritative Change Graph and require the exact review and accepted resolution
  revisions. Merge applies only when target, closure, evidence, gate, conflict
  state, and expected result digest still match.
- `epoch.protocol/v1` owns the browser-safe schemas and typed errors. Core owns
  pure graph validation and transaction application.
- The machine-readable transaction capability limits crash-recoverable atomic
  publication to the journaled `QuarantineTransaction`. Direct repository
  append, generic sync batches, and callback-based Git promotion are explicitly
  reported as non-atomic until they are routed through a transactional store.

## Pre-release cleanup

Epoch had no released compatibility contract for the exploratory `stack`,
`weave`, `review`, `epoch:revision:*`, or `epoch:change:legacy:*` spellings.
They are rejected rather than aliased. The Change Graph CLI now appends signed
protocol events through `SignedChangeGraphStore`. A leftover
`.epoch/change-graph-v1.json` file is ignored and is not a source of truth.

## Consequences

Stable lineage and exact review evidence survive description edits and graph
reprojection. Stale heads, gates, reviews, dependencies, and revisions fail
with typed errors rather than implicit rebases. Binary semantic merge remains
unsupported; binary fragments use exact or replace behavior.

## Revisit Criteria

Revisit when split acceptance and workspace capture also become signed
protocol events, or a
new schema version requires an explicit event migration.

## Related

- [Epoch Nomenclature](../nomenclature.md)
- [Change Graph And Operation History](../change-graph.md)
- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [CLI Reference](../cli.md)
- [SDK Reference](../sdk.md)
