# Epoch Nomenclature

Epoch uses one vocabulary across Protocol, Core, CLI, SDK, Community, and
Operations. These terms are contracts, not synonyms.

| Term | Meaning | Do not call it |
|---|---|---|
| **Repository** | The signed event graph, verified objects, and policy state for one body of work. | A Git repository when referring to native Epoch state. |
| **Event** | One immutable signed fact. Its event ID is also the exact `RevisionId` when the event records a change revision. | A mutable record or branch. |
| **Frontier** | The precise graph term for the current set of event heads. Use it only in causality and sync APIs. | The product, CLI family, or change model. |
| **Change** | A stable logical unit of work with an opaque `ChangeId`. | An intent, branch, commit, patch, or pull request. |
| **Revision** | An immutable signed state of one Change. A Change can have multiple current heads. | A mutable version number or `epoch:revision:*` ID. |
| **Fragment** | An ordered, preconditioned content operation inside a Revision. | A claim of independent mergeability. |
| **Change Graph** | Revisions plus hard dependency and presentation edges. Its ID kind is `change-graph`. | A native stack. “Stack” is reserved for external stacked-branch projections such as Graphite. |
| **Review Bundle** | An immutable review scope binding exact Revisions, base, combined tree, conflicts, and gate definition. | A weave or mutable review branch. |
| **Materialization** | A reproducible temporary tree produced from a View, Change, Change Graph, or Review Bundle. | The authoritative object or an isolated runtime. |
| **Merge Plan** | A compare-and-swap proposal for a dependency-closed set with exact evidence and a resulting digest. | An auto-merge guess. |
| **Conflict** | Durable signed state containing all known sides and resolution lineage. | An exception that may be discarded. |
| **View** | A named logical selection over repository history. | A workspace, branch, or sandbox. |
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

## Command language

Native commands use nouns that match the model:

- `epoch change ...` creates and revises stable Changes.
- `epoch graph ...` manages a Change Graph.
- `epoch bundle ...` creates, inspects, and materializes a Review Bundle.
- `epoch merge-plan ...` plans, inspects, and applies an exact merge.
- `epoch log --revisions 'graph(<id>)'` queries graph membership.

There are no `stack`, `weave`, `frontier`, or pre-release-ID command aliases. Epoch
has not shipped a compatibility contract for those pre-release spellings.

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
  explicit signed Code Operations with optional conversation digests; it does
  not claim universal capture, a live arbitrary-tool CRDT mount, or durable
  character-level permalinks.

See [Change Graph And Operation History](change-graph.md) and the
[version-control comparison](competition/change-graph-vcs-dossier.md) for the
capability and loss boundaries.
