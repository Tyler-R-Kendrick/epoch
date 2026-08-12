# ADR-0030: Stable Changes, Revisions, Stacks, Reviews, And Merges

Status: Accepted and implemented

## Context

An intent event was useful but could not express a stable logical change with
multiple immutable revisions, explicit dependency stacks, review evidence tied
to an exact frontier, or a merge plan that fails when its target moves.

## Decision

- Canonical 256-bit IDs distinguish changes, revisions, fragments, stacks,
  reviews, merge plans, conflicts, principals, and repositories.
- A `ChangeId` names the logical lineage; a revision names immutable content
  with explicit parent revisions and base/result tree digests.
- Stack edges are typed and acyclic. Partial merge takes a dependency-closed
  subset. Split acceptance must reconstruct the original ordered fragments
  byte-for-byte. Squash records every source revision as provenance.
- Review bundles bind exact revisions, frontier, tree digests, conflicts, and a
  gate digest. Merge applies only when target, closure, gate, conflict state,
  and expected result digest still match.
- `epoch.protocol/v1` owns the browser-safe schemas and typed errors. Core owns
  pure graph validation and transaction application.

## Compatibility And Migration

Existing events are never rewritten. A valid legacy `intent` is exposed by a
read-only projection whose `ChangeId` is `epoch:change:legacy:<event-id>` and
whose revision remains the original event ID. Repository identity is additive;
opening an old repository assigns no replacement identity to existing events.

The local `.epoch/frontier-v1.json` CLI store is a reference host for the new
command grammar, not the canonical repository event store. Delete that file to
remove its local records; signed legacy events remain intact.

## Consequences

Stable lineage and exact review evidence survive description edits and graph
reprojection. Stale heads, gates, reviews, dependencies, and revisions fail
with typed errors rather than implicit rebases. Binary semantic merge remains
unsupported; binary fragments use exact or replace behavior.

## Revisit Criteria

Revisit when the reference CLI is wired to durable canonical transactions or a
new schema version requires an explicit event migration.

## Related

- [Frontier VCS Convergence](../frontier-vcs-convergence.md)
- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [CLI Reference](../cli.md)
- [SDK Reference](../sdk.md)
