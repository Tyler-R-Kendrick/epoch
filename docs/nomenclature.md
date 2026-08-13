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
| **Space** | A signed, joinable object composing one View, per-machine Workspaces, conversation, participant Grants and Budgets, and per-turn Sandbox bindings. | A View, Workspace, Sandbox, or Change. It references them; it is none of them, and it confers no authority a Grant did not issue. |
| **Capture Session** | A signed, scoped, time-bounded consent record under which Code Operations may be recorded continuously. | Permission to capture by default, or a claim that everything was captured. |
| **Anchor** | A durable reference to a structural path inside an exact Revision. | A line number, byte offset, or operation position. |
| **Projection** | A declared mapping to another representation. Always qualify it: Git projection, forge projection, social projection, or filesystem projection. | Epoch authority. |
| **Operation** | Local command-history state used for recovery and undo. It is not shared unless explicitly published as evidence. | A Revision or a universal editor operation stream. |
| **Code Operation** | An explicitly recorded signed CRDT edit. It may link to a Change, session, tool, and private conversation digest. | Continuous capture of editor or terminal activity. |
| **Residency** | Which verified objects are locally present. | Materialization or copy-on-write. |
| **Workspace** | Materialized files owned by a provider and bound to repository state. | Execution isolation. |
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
- `epoch space ...` opens, joins, and operates a Space, including capture
  sessions and anchors.

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

See [Change Graph And Operation History](change-graph.md) and the
[version-control comparison](competition/change-graph-vcs-dossier.md) for the
capability and loss boundaries.
