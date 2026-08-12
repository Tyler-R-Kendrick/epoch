# Change Graph And Operation History

Epoch separates stable logical Changes from immutable signed Revisions. A
Change Graph pins exact Revisions and dependencies. A Review Bundle binds an
exact combined review scope without rewriting those Revisions. A Merge Plan
accepts only a dependency-closed selection whose target, conflicts, policy, and
gate evidence still match.

The browser-safe `@epoch/protocol` package owns canonical IDs, schemas, revsets,
and inspection. `@epoch/core` owns explicit-parent transactions, Change Graph
validation, split reconstruction, Review Bundles, Merge Plans, conflicts,
objects, sync, and Workspaces. Git, forge, social, and archive packages remain
declared projections; none becomes native Epoch authority.

New event payloads use `change-graph.defined` and `change-graph.revised`.
Canonical IDs use `epoch:change-graph:*` and `epoch:review-bundle:*`.
`RevisionId` is the signed event ID. Pre-release `stack`, `review`,
`epoch:change:legacy:*`, and `epoch:revision:*` identifiers fail closed.

The CLI persists Change, Change Graph, Review Bundle, review, and Merge Plan
facts as signed events through `SignedChangeGraphStore` and
`appendWithParents()`. Local operation undo/restore stays in
`.epoch/operations/`. Split proposals and workspace handles remain local drafts
until they have a protocol event. Recoverable all-old/all-new publication is
provided by `QuarantineTransaction`; a capability declaration must not promote
weaker callback or in-memory behavior as atomic. A leftover
`.epoch/change-graph-v1.json` file is ignored.

Epoch records local Operations for command recovery, signed Code Operations
for explicit CRDT edits, and Fragments/Revisions for portable logical history.
A Code Operation may carry Change/session/tool context and a digest linking to
a private conversation without publishing its transcript. Epoch does not
continuously capture unreported editor or terminal activity, mount a live CRDT
worktree for arbitrary tools, or provide durable character-level permalinks.
Those remain the most important differences from Zed DeltaDB, documented in the
[comparison dossier](competition/change-graph-vcs-dossier.md#zed-deltadb).

The normative vocabulary is [Epoch Nomenclature](nomenclature.md). The material
decisions are [ADR-0030](design-decisions/0030-stable-changes-revisions-stacks-reviews-merges.md),
[ADR-0031](design-decisions/0031-durable-conflicts-and-conservative-commutation.md),
and [ADR-0036](design-decisions/0036-swhids-and-software-heritage-archival.md).
