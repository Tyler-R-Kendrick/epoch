# Epoch Nomenclature

Epoch uses one vocabulary across Protocol, Core, CLI, SDK, Community, and
Operations. These terms are contracts, not synonyms.

| Term | Meaning | Do not call it |
|---|---|---|
| **Repository** | The signed event graph, verified objects, and policy state for one body of work. | A Git repository when referring to native Epoch state. |
| **Event** | One immutable signed fact. Its event ID is also the exact `RevisionId` when the event records a change revision. | A mutable record or branch. |
| **Frontier** | The precise graph term for the current set of event heads. Use it only in causality and sync APIs. | The product, CLI family, or change model. |
| **Change** | A stable logical unit of work with an opaque `ChangeId`. Created with `epoch change`. | An intent, branch, commit, patch, pull request, or Community Change. |
| **Community Change** | A Community collaboration object with source/target Views, status, and Community reviews. Created with `epoch-community changes create` and shown in Community Web. | An Epoch Change, Review Bundle, or Git pull request. |
| **Revision** | An immutable signed state of one Change. A Change can have multiple current heads. | A mutable version number or `epoch:revision:*` ID. |
| **Fragment** | An ordered, preconditioned content operation inside a Revision. | A claim of independent mergeability. |
| **Change Graph** | Revisions plus hard dependency and presentation edges. Its ID kind is `change-graph`. | A native stack. “Stack” is reserved for external stacked-branch projections such as Graphite. |
| **Review Bundle** | An immutable review scope binding exact Revisions, base, combined tree, conflicts, and gate definition. | A weave or mutable review branch. |
| **Materialization** | A reproducible temporary tree produced from a View, Change, Change Graph, or Review Bundle. | The authoritative object or an isolated runtime. |
| **Merge Plan** | A compare-and-swap proposal for a dependency-closed set with exact evidence and a resulting digest. | An auto-merge guess. |
| **Conflict** | Durable signed state containing all known sides and resolution lineage. | An exception that may be discarded. |
| **View** | A named logical selection over repository history. | A workspace, branch, or sandbox. |
| **Space** | A signed, joinable object composing one View, per-machine Workspaces, conversation, participant Grants and Budgets, and per-turn Sandbox bindings. | A View, Workspace, Sandbox, or Change. It references them; it is none of them, and it confers no authority a Grant did not issue. |
| **Capture Session** | A signed, scoped, time-bounded consent record under which Code Operations may be recorded continuously. | Permission to capture by default, or a claim that everything was captured. |
| **Anchor** | A durable reference to a structural path inside an exact Revision. | A line number, byte offset, or operation position. |
| **Projection** | A declared mapping to another representation. Always qualify it: Git projection, forge projection, social projection, or filesystem projection. | Epoch authority. |
| **Operation** | Local command-history state used for recovery and undo. It is not shared unless explicitly published as evidence. | A Revision or a universal editor operation stream. |
| **Code Operation** | An explicitly recorded signed CRDT edit. It may link to a Change, session, tool, and private conversation digest. | Continuous capture of editor or terminal activity. |
| **Residency** | Which verified objects are locally present. | Materialization or copy-on-write. |
| **Workspace** | Materialized files owned by a provider and bound to repository state. | Execution isolation. |
| **Repository Link** | An exact, read-only mount of another Repository's Version at a path in this Repository's namespace. ([ADR-0040](design-decisions/0040-repository-composition-and-links.md)). | A submodule, subtree, subrepo, or package dependency. |
| **Composition** | The acyclic namespace graph produced by resolving a Repository's Links at an exact state. | A checkout, a manifest of remotes, or a package lock. |
| **Selection** | Which resources in the composed namespace are relevant to one Workspace. Workspace-local by default. ([ADR-0041](design-decisions/0041-workspace-selection-and-materialization-modes.md)). | A View, a sparse-checkout pattern file, or Residency. |
| **Materialization Mode** | How a Workspace realizes its Selection: `eager`, `explicit`, `lazy`, or `delta`. | Sparse checkout. `delta` is the mode formerly spelled `--virtual`. |
| **Namespace Manifest** | The content-addressed directory DAG describing a Repository's namespace, bound by a Version or compact. Derived, never authoritative. | A second history, or a signed working-tree cache. |
| **Sandbox** | An execution provider with declared process, filesystem, network, secret, and cleanup capabilities. | A View or Workspace. |
| **Principal** | A human, agent, service, device, or organization identity. | A display name or author string. |
| **Grant** | An attenuated authorization from an issuer to a subject. | Membership or identity. |
| **Budget** | Durable reserved and consumed resource authority. | A process-local rate limit. |
| **Evidence** | A digest-bound review, gate, session, or tool result with an explicit verification state. | Proof when its state is unverified. |

## Community search and namespace language

| Term | Meaning | Do not call it |
|---|---|---|
| **Entity** | One canonical, authorization-controlled Community object with a stable `CommunityObjectRef`, typed fields, relations, provenance, and timestamps. | A row, message, path, search document, or projection entry. |
| **Field Registry** | The versioned authority for field names, aliases, types, operators, sensitivity, sorting, facets, and completion. | A bag of source-native keys or GraphQL introspection alone. |
| **Search Expression** | The typed semantic predicate shared by text search, GraphQL, saved definitions, planning, and residual evaluation. | Query text, a Lucene AST, SQL, or an AI prompt. |
| **Normalized Query** | The parsed human query plus canonical text/JSON, diagnostics, resolved contextual values, sort order, registry version, and hash. | The execution plan. |
| **Search Plan** | An authorization-bound, costed partition of one Search Expression into source pushdown and Core residual evaluation. | A query string or backend request. |
| **Search Snapshot** | The exact resolved time, authorization fingerprint, analyzer/registry versions, source checkpoints, query hash, and plan hash that bind pagination. | A mutable latest-results cache. |
| **Search Backend** | A rebuildable execution accelerator that conforms to the Core reference evaluator. | Canonical storage or a source of truth. |
| **Source Adapter** | A registered, capability-declared reader of canonical Entities and monotonic or explicitly reset checkpoints. | A search backend or hidden network fetch. |
| **Projection Definition** | Versioned declarative JSON that selects, groups, traverses, unions, aliases, and formats Entities into a hierarchy. | A copied result tree, saved view, script, or mount. |
| **Projection Entry** | One occurrence produced by a Projection Definition. Its stable `entryId` names the occurrence; `target` names the Entity. | The canonical object or a duplicate object. |
| **Namespace** | The ordered hierarchy visible to one authorized context after composing mounts. | The canonical object graph or a filesystem on disk. |
| **Namespace Mount** | One scoped `replace`, `before`, or `after` composition of a Projection Definition at a namespace path. | A Projection Definition, Git mount, or write authority. |
| **Recovery Namespace** | The immutable `/.epoch/*` routes for the built-in namespace, canonical lookup, definitions, sources, and diagnostics. | A user projection or optional mount. |

The source type name `VfsEntry` is an implementation spelling; product copy and
new public documentation say **Projection Entry**. “Virtual filesystem” is an
analogy for navigation, not an identity, storage, or operating-system claim.
The same Entity can have many Projection Entries, including more than one entry
inside the same Projection Definition.

## Command language

Native commands use nouns that match the model:

- `epoch change ...` creates and revises protocol Changes on the local Change Graph reference host.
- `epoch graph ...` manages a Change Graph on that same host.
- `epoch bundle ...` creates, inspects, and materializes a Review Bundle record.
- `epoch merge-plan ...` plans, inspects, and applies a merge-plan record.
- `epoch log --revisions 'graph(<id>)'` queries graph membership.
- `epoch space ...` opens, joins, and operates a Space, including capture
  sessions and anchors.
- `epoch-community changes ...` creates and reviews Community Changes. It does not write `epoch change` IDs.

New workflows do not add `stack`, `weave`, `frontier`, or `saved view` aliases.
Persisted schema 1 and schema 2 data are migration inputs, not product language;
migration preserves canonical IDs and quarantines invalid definitions without
keeping duplicate Community search/projection runtime models. The older
repository-event CLI still exposes intent-policy commands and is the remaining
nomenclature inconsistency; it is not used by the Change Graph workflows.

## Similar words with different boundaries

- A Git commit resembles a Revision because both are immutable snapshots, but
  a Revision belongs to a stable Change and can carry signed fragments,
  conflicts, grants, budgets, and evidence outside Git's ontology.
- A jj change resembles an Epoch Change. Epoch additionally makes exact review,
  merge, authority, projection, and evidence boundaries portable and signed.
- A Graphite stack is a linear presentation over branches. An Epoch Change
  Graph is a DAG; `orders-after` does not become a hard dependency.
- A GitButler virtual branch resembles a materialized lane. Epoch keeps
  Workspace storage, object Residency, and Sandbox isolation as separate facts.
- A Git submodule resembles a Repository Link because both pin an exact external
  state, but Epoch stores link identity, target, and namespace root in one signed
  record and keeps composition, Selection, Residency, and Materialization as
  separately answerable facts rather than independent state machines.
- A Git subtree or `git-subrepo` directory resembles vendored Epoch source, but
  Epoch records signed provenance and an optional synchronization Projection
  instead of reconstructing synthetic history on every split.
- A Git sparse checkout resembles a Selection, but Epoch's Selection is
  order-independent set algebra scoped to one Workspace, and it does not decide
  by itself which bytes are resident or which files are written.
- A DeltaDB delta resembles an Epoch Code Operation or Fragment in granularity,
  but DeltaDB continuously captures editor/worktree operations. Epoch records
  explicit signed Code Operations, and continuous recording is legal only inside
  a signed Capture Session that declares scope, retention, and redaction. Epoch
  does not claim universal capture, a live arbitrary-tool CRDT mount, or durable
  character-level permalinks.
- A Delta thread resembles an Epoch Space: both make in-progress agent work
  joinable. A Delta thread owns its worktrees; an Epoch Space only *references*
  Workspaces, so residency, materialization, and execution isolation stay
  separately reported facts. Membership in a Space is a Grant, so revocation and
  budget limits are enforced rather than advisory.

## Commonly confused boundaries

- **Search Expression vs. text query:** text is a strict human frontend. GraphQL
  clients send structured Search Expressions and never manufacture text for
  Epoch to reparse.
- **Search Plan vs. backend request:** a plan already contains authorization,
  source applicability, residual semantics, cost, snapshot, and total order. A
  backend request is one bounded implementation step.
- **Projection Definition vs. Namespace Mount:** a definition says what
  hierarchy exists; a mount says where and at what precedence it appears.
- **Projection Entry vs. Entity:** an entry is contextual and may move or be
  shadowed; Entity identity does not.
- **Namespace vs. Workspace:** a Namespace organizes discoverable Entities. A
  Workspace materializes repository content. Neither implies process isolation.

See [Change Graph And Operation History](change-graph.md) and the
[version-control comparison](competition/change-graph-vcs-dossier.md) for the
capability and loss boundaries.
