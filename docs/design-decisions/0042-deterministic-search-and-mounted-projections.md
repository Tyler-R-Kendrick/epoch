# ADR-0042: Deterministic Search And Mounted Projections

Status: Accepted

## Context

Community already had canonical object identity, explicit message relations, a
strict query parser, flat saved projection occurrences, and a keyboard-first
namespace. Those pieces established the right identity rule but left several
authorities duplicated: browser and Core query evaluation could disagree, a
saved result list could not define a lazy hierarchy, and paths, query text,
backend indexes, and source state were too easy to confuse with canonical data.

The product needs deterministic cross-source discovery and user-defined
hierarchies without making AI, SQL, a browser index, or a filesystem path the
semantic authority. Authorization must precede counts, ordering, facets,
suggestions, collision names, and explanations.

## Decision

Epoch uses one dependency-free semantic pipeline in `@epoch/community-core`:

1. A text query or structured GraphQL input becomes a typed **Search
   Expression**.
2. The Field Registry validates fields, operators, values, sensitivity, and
   ordering.
3. Planning resolves contextual time once, applies authorization, partitions
   source pushdown from residual evaluation, enforces cost limits, and binds a
   **Search Snapshot**.
4. The Core reference backend defines filtering, ordering, pagination, facets,
   suggestions, and explanation semantics. Optimized backends may narrow
   candidates but cannot silently change those semantics.
5. A **Projection Definition** declaratively turns authorized Entities into
   Projection Entries. An entry identifies one occurrence; its target retains
   canonical Entity identity.
6. Scoped **Namespace Mounts** compose definitions with `replace`, `before`,
   and `after`. The immutable `/.epoch/*` recovery namespace remains reachable.

The built-in namespace is `builtin:default`, expressed through the same
Projection Definition model. Definitions contain no JavaScript, shell, regex,
SQL, model call, or network fetch. AI can propose visible JSON or a visible text
query only through an explicit action; deterministic validation and execution
remain authoritative.

Snapshot-bound keyset cursors include the plan, authorization, projection, and
source-checkpoint binding. A path is an alias over identity. A search index is
rebuildable. A failed source produces explicit partial, stale, or unavailable
metadata rather than an empty success.

### Frontends and dependencies

- The owned text parser remains the human frontend. Liqe is not a runtime
  dependency and its AST is not a public contract.
- `graphql@17.0.2` provides the portable structured API and September 2025
  `@oneOf` input semantics. GraphQL resolvers receive host authorization and do
  not import persistence, browser globals, or Node filesystem APIs.
- `@orama/orama@3.1.18` is the selected browser lexical accelerator. Vector,
  hybrid, RAG, answer-generation, telemetry, and cloud modes are excluded.
- `@sqlite.org/sqlite-wasm@3.53.0-build1` is the optional browser Worker
  persistence/FTS engine. OPFS is capability-detected; it is neither canonical
  storage nor a Node durability promise.
- Tantivy is rejected for this implementation because Rust/native/WASM
  packaging adds an unmeasured deployment and supply-chain cost.
- Arbitrary SQL is rejected as a public frontend. SQLite receives parameterized
  statements produced from the typed AST; users do not submit SQL.

Exact package audit and asset evidence is recorded in
[Dependency Exceptions](../dependency-exceptions.md). The presence of a pinned
dependency does not by itself prove backend conformance; executable evidence is
tracked in the [search/projection evidence index](../evidence/community-search-projection/README.md).

## Comparisons And Vocabulary Boundaries

| System | Similar | Epoch difference | Not claimed |
|---|---|---|---|
| Lucene query syntax | Concise fields, Boolean operators, phrases, ranges, and prefix terms. | Epoch text is only a strict frontend to a typed Search Expression with source spans, contextual resolution, authorization, and bounded cost. | Lucene index/query-parser compatibility, boosts, proximity, regex, or silent recovery. |
| GraphQL | Typed traversal, introspection, variables, connections, and subscriptions. | GraphQL and text converge on the same Search Expression and Projection services; GraphQL does not become storage. | A second query meaning or offset pagination. |
| Haiku live queries | Durable queries can behave like continuously updated collections. | Epoch binds deltas to explicit source checkpoints, authorization, snapshots, and queued/live/snapshot update modes. | Haiku BFS/query-database compatibility. |
| Plan 9 namespaces | Ordered replace/before/after composition and first-match lookup. | Epoch mounts authorized Projection Definitions over canonical Entities and provides stable occurrence IDs and an immutable recovery namespace. | 9P, kernel mounts, or operating-system write semantics. |
| Orama | In-browser lexical indexing and Worker-friendly execution. | Orama is an authorization-scoped candidate accelerator; Core retains residual and ordering authority. | Vector, cloud, AI, or canonical persistence. |
| SQLite FTS5/WASM | Typed filtering, FTS, durable local cache, and OPFS options. | The database is a rebuildable browser read model with capability/failure reporting and single-writer coordination. | Portable Node persistence, universal OPFS, or arbitrary SQL. |
| Git | Paths and trees offer familiar navigation. | Paths are scoped aliases; Entity identity and signed repository identity are independent of them. | A projection path as a Git path or object ID. |
| jj | Revsets and operation history make graph selection and recovery concise. | Community Search Expressions query canonical Entities; repository revsets query Revisions. The languages and authorities remain separate. | jj revset syntax or operation-store compatibility. |
| Graphite / GitButler | Saved stack/lane presentations organize the same underlying work in useful ways. | Projection Entries may repeat one Entity without rewriting Change identity or conflating Workspace/storage/isolation. | Proprietary stack or virtual-branch APIs. |
| Pijul / Darcs | Stable changes and explicit relations motivate graph-oriented selection. | Search/projection relations are discovery structure; merge commutation still requires Core proof. | Patch-theory algebra from namespace traversal. |
| Zed DeltaDB | Stable fine-grained work identity, human/agent context, and Git interoperation sit below commit-only history. | DeltaDB is described as editor-native continuous operation capture and CRDT worktree sync. Epoch is editor-independent signed event authority with exact review/merge/policy and declarative cross-source discovery. | Universal operation capture, a live arbitrary-tool CRDT mount, character-level durable permalinks, or DeltaDB protocol compatibility. |

DeltaDB is Epoch's closest direct competitor at the history/context layer, not
a search-backend substitute. Zed's public pages describe a product direction
and early-access experience; as of 2026-08-12 they do not publish a stable
external storage protocol, signature/authority model, self-hosting contract, or
migration format sufficient for a fidelity adapter. Epoch therefore records
the comparison without inventing a DeltaDB codec.

## Consequences

- One Entity can appear at many paths or multiple times in one definition
  without identity corruption.
- Backend feature differences are explicit residual work or typed unsupported
  errors, never ignored predicates.
- Fixed snapshots are reproducible; live and queued projections can preserve
  focus by Projection Entry and target identity.
- Source/index failures remain visible and recoverable.
- The architecture costs more explicit metadata, cursor binding, migration,
  backend conformance, and privacy non-interference testing.

Persisted Community state accepts only schema version 3. Earlier bags are
refused at the persistence boundary. Invalid definitions are quarantined for
export and recovery when seeding current Projection Definitions.

## Primary References

Accessed 2026-08-12:

- [Apache Lucene query parser syntax](https://lucene.apache.org/core/9_12_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html)
- [GraphQL September 2025 specification](https://spec.graphql.org/September2025/)
- [Orama documentation](https://docs.orama.com/open-source/)
- [SQLite FTS5](https://sqlite.org/fts5.html)
- [SQLite WASM persistence](https://sqlite.org/wasm/doc/trunk/persistence.md)
- [Plan 9 namespaces](https://9p.io/sys/doc/names.html)
- [Plan 9 `bind`](https://9p.io/magic/man2html/1/bind)
- [Haiku queries](https://www.haiku-os.org/docs/userguide/en/queries.html)
- [Zed DeltaDB](https://zed.dev/deltadb)
- [Introducing DeltaDB](https://zed.dev/blog/introducing-deltadb)
- [jj operation log](https://docs.jj-vcs.dev/latest/operation-log/)
- [Pijul changes](https://pijul.org/manual/why_pijul)
- [Darcs theory](https://darcs.net/Theory)

## Related Documents

- [Epoch Nomenclature](../nomenclature.md)
- [Community Search And Projections](../community-search-projections.md)
- [ADR-0029](0029-community-canonical-objects-and-projections.md)
- [Change Graph comparison](../competition/change-graph-vcs-dossier.md)
