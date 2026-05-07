# ADR-0004: First-Class Repository Creation And Versions

Status: Accepted

## Context

Epoch can initialize signed repositories, record files, materialize CRDT state,
sync local repository paths, and bridge trusted Git repositories. The current
entry point is accurate for developers who already understand the event log,
but it makes the simplest user stories feel like SDK or CLI plumbing:

- create an empty repository quickly;
- turn existing assets into a repository after the assets already exist;
- give deployed assets a stable version id and materialization path; and
- explain repository state without requiring Git or Epoch internals first.

Competition research reinforces the risk. GitHub can overwhelm non-experts with
repository concepts, Graphite adds setup vocabulary before value, Jujutsu and
Pijul show that advanced local models must stay recoverable, Radicle must keep
explaining peer persistence, and Sapling shows the value of a clear state view.

## Decision

Epoch should add a user-facing repository creation layer and a signed version
event type:

- `create` is the simple empty-repository story and remains compatible with the
  current `init` behavior.
- `push` is the asset-first story: open or create a repository, record existing
  assets, and optionally create the first version.
- `version` events are signed manifest events that bind a view/frontier to
  deployable files and optional CRDT materialized snapshots.
- Version event ids are canonical. Human-readable names are aliases and must be
  resolved explicitly when collisions occur.
- Version materialization must verify referenced blobs and write deterministic
  output without overwriting user files by default.

## Consequences

Positive:

- New users get immediate value without learning events, blobs, views, or intent
  policy first.
- Existing APIs remain available for expert and compatibility workflows.
- Deployed assets become auditable Epoch history instead of a side-channel
  release record.
- The same model works for file assets, imported Git content, and CRDT-backed
  application or agent state.

Trade-offs:

- `push` may be read as network publication by users coming from Git. The
  implementation should test command language and can support `capture` as an
  alias if user feedback prefers it.
- Full version manifests may be verbose for large repositories. Correctness and
  explainability should come first; compact integration can optimize later.
- Friendly version names introduce collision handling after sync. The event id
  remains the durable identity.

## Rejected Alternatives

Only document better `init` and `record` examples.

- Rejected because it keeps the mental model centered on storage primitives
  instead of the user's "I have assets" and "I need a deployable version" jobs.

Use HA/DR compacts as the version mechanism.

- Rejected because compacts solve recovery and log-prefix storage, while
  deployable versions need a user-facing manifest, friendly names, and exact
  materialization behavior.

Store versions in a mutable `versions.json` registry only.

- Rejected because versions must be signed, syncable, and auditable through the
  normal event log.

Make Git import/export the primary create story.

- Rejected because many target users have assets or application state before
  they have a Git repository, and Epoch should not require Git literacy for the
  simplest path.

## Revisit Criteria

Revisit this decision if implementation feedback shows:

- users consistently misunderstand `push` even with documentation;
- version manifests are too expensive for realistic asset repositories;
- sync conflict behavior for friendly version names becomes hard to explain; or
- compacts become the dominant deployment artifact and can absorb version
  manifests without weakening auditability.

## Related Documents

- [Create Repository And Version Materialization Spec](../create-repository-and-version-materialization.md)
- [Current Design](../design.md)
- [CLI Reference](../cli.md)
- [Core SDK Reference](../sdk.md)
