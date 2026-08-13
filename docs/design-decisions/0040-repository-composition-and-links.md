# ADR-0040: Repository Composition And Repository Links

Status: Accepted (design). Not implemented.

## Context

Epoch has no way to express that one repository's namespace includes source
owned by another repository. Named Views select event IDs inside a single
Repository, Git locators clone and ingest content rather than mounting a second
Repository, and Change Graph dependencies pin exact Revisions without naming a
repository. Git ingest already reports `submodule-link` as an unsupported, lossy
feature ([ADR-0033](0033-git-v2-quarantine-and-projection-fidelity.md)), so
composed Git repositories cannot round-trip.

Git solves three different intents with three unrelated mechanisms — submodules
(pin external identity and history), subtree/subrepo (copy files and
reconstruct provenance), and monorepo-plus-sparse-tooling (one authority,
selective transfer). The intents are real and should be preserved. Git's
fragmentation should not be: composition state is spread across `.gitmodules`, a
tree gitlink, index bits, sparse config, promisor metadata, and per-command
recursion flags, so "why is this path missing?" has no single answer.

Full analysis, comparisons, and sequencing are in
[Repository Composition And Workspace Selection](../repository-composition-and-selection.md).

## Decision

**One native primitive.** A **Repository Link** is the only native way to
embed an independently owned repository. "Submodule", "subrepo", and "subtree"
remain Git interoperability terms, never Epoch nouns. A Link records a stable
`linkId`, a `mountPath`, and a target of `{repositoryId, versionId,
sourcePath?, namespaceRoot}`, plus non-authoritative `resolverHints`.

- `repositoryId` identifies authority; a URL does not.
- `versionId` and `namespaceRoot` are exact and immutable. A floating branch is
  never a committed target: "follow child main" is an updater policy that
  proposes a Change.
- All signed semantic link information is stored atomically in one record, not
  split the way Git splits gitlink and `.gitmodules`. Local resolver overrides
  stay local.
- Mount paths are normalized, cannot escape the parent namespace, and may not
  collide or overlap in v1. Composition is acyclic.
- A Link conveys no authorization and executes no child code. Child hooks are
  inert unless separately trusted and invoked in a Sandbox.
- Concurrent retargeting of one `linkId` produces a durable Conflict
  ([ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)), not
  last-writer-wins.

**Read-only first.** A linked repository is read-only from the parent
Workspace. Changing it means opening a Workspace for the child, producing a
child Change and exact child Version, then producing a parent Change that
retargets the Link and depends on that exact child state. This preserves
ownership boundaries and prevents a parent record operation from capturing files
into the wrong Repository.

**No native subtree type.** Copied source is ordinary parent-owned files plus
signed provenance (source repository, version, source path, destination path,
imported root digest) plus an optional synchronization Projection. Upstream
updates become a three-way merge over last-imported root, new upstream root,
and current local root, instead of reconstructed synthetic history. The inverse
— publishing part of a monorepo as an independently clonable repository — reuses
existing Projection semantics and reports loss like any other projection
([ADR-0035](0035-forge-adapters-and-mirror-authority.md)).

**Cross-repository work is dependency-linked, not atomic.** Change Graph
dependency edges gain a repository-qualified form carrying `repositoryId`, an
exact `revisionId` or `versionId`, and an `expectedDigest`. A multi-repository
Review Bundle aggregates exact repository-qualified Revisions into one review
scope while each Repository stays authoritative for its own acceptance
([ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md)). Publish
and verify the child before accepting the parent pin, use compare-and-swap on
every participating Repository, and expose partial publication and recovery
state rather than claiming atomicity unless all participants share a genuinely
capable transaction authority.

**Availability is separate from identity.** A Link accumulates resolver
availability receipts, retention or archival receipts, signed mirror receipts,
portable bundle references, and SWHID mappings
([ADR-0036](0036-swhids-and-software-heritage-archival.md)), under a policy
stating how many independent resolvers must retain the target. A parent may
cache or bundle a child's exact objects without owning them: linked identity
plus bundled bytes is not vendored ownership.

## Consequences

Positive:

- One primitive covers the submodule intent; the subtree and subrepo intents
  reduce to owned files plus provenance plus a Projection, so the core model
  gains one concept rather than three.
- Composition, Selection, Residency, and Materialization stay independently
  expressible, so a missing path has one diagnostic that names which dimension
  hid it — the failure Git cannot resolve.
- Git ingest gains a faithful target for `submodule-link`, converting an
  unsupported feature into a declared mapping with reported loss.
- Cross-repository review becomes a single exact scope without pretending
  independently governed repositories commit atomically.

Trade-offs:

- Read-only links mean a cross-repository edit is a two-Change stack, which is
  more ceremony than editing inside a Git submodule working tree.
- Disallowing overlapping mount roots in v1 defers the layered static/dynamic
  Community harness until precedence, ownership, conflict, and rollback
  semantics are specified.
- Repository-qualified dependencies add a resolution and authorization surface
  to the Change Graph, and availability evidence adds state that must be kept
  truthful rather than assumed.
- Vendorize is a deliberate one-way ownership transfer; recovering the link
  relationship afterwards requires the recorded provenance.

## Revisit Criteria

Revisit this decision if:

- writable nested links are needed before cross-repository ownership and
  publication behavior is proven in practice;
- overlapping or layered mount roots become required, at which point precedence,
  ownership, conflict, and rollback rules must be specified first;
- a shared transaction authority makes genuinely atomic multi-repository
  publication possible; or
- package/artifact references and Repository Links start converging, which would
  mean composition is being used as a package manager.

## Related Documents

- [Repository Composition And Workspace Selection](../repository-composition-and-selection.md)
- [ADR-0041: Workspace Selection And Materialization Modes](0041-workspace-selection-and-materialization-modes.md)
- [ADR-0030: Stable Changes, Revisions, Change Graphs, Reviews, And Merges](0030-stable-changes-revisions-stacks-reviews-merges.md)
- [ADR-0032: Residency, Native Sync, And Workspace Providers](0032-residency-native-sync-and-workspace-providers.md)
- [ADR-0033: Git v2, Quarantine, And Projection Fidelity](0033-git-v2-quarantine-and-projection-fidelity.md)
- [ADR-0035: Forge Adapters And Mirror Authority](0035-forge-adapters-and-mirror-authority.md)
- [Epoch Nomenclature](../nomenclature.md)
</content>
