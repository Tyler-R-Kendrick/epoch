# ADR-0043: Spaces — Shared, Signed, Joinable Workspaces

Status: Accepted and implemented for phases 1–3; phases 4–6 are not built

## Context

Zed shipped Delta and DeltaDB: an operation-level history layer under Git and a
multiplayer agent environment on top of it. The
[workspace convergence analysis](../competition/delta-workspace-convergence.md)
records the primary-source detail. Two findings drive this decision.

**First, the unit people want is a joinable space, not a repository or a
branch.** Delta's thread is "the basic unit of work… one thread, one agent, and
its own worktrees," and it is the object that gets shared. Each participant
receives their own checkout of the thread's worktrees, synced continuously,
and everyone sees messages, edits, comments, and agent activity live. That
shape — a space you join, in which conversation and materialized code are the
same artifact — is what `PRODUCT.md` already describes as Epoch's positioning,
and Epoch has no object that provides it.

Epoch today has **View** (a named logical selection over history), **Workspace**
(provider-owned materialized files), **Sandbox** (a declared execution
provider), **Change** and **Change Graph** (stable logical work), Community
channels (conversation), **Code Operation** (signed CRDT edits), and
**Principal**/**Grant**/**Budget** (authority). Every part exists. Nothing binds
them into something a second person can join.

**Second, the copy-on-write framing is not the mechanism to copy.** Delta's
launch post says the worktree is virtualized and any point in history can be a
branch point. Its documentation describes per-machine checkouts as real folders
with a `.delta` metadata directory and two Git remotes, and describes no kernel
VFS, FUSE mount, or filesystem copy-on-write. The durable idea is that the
branch point moved from a commit to an operation and the workspace became a
shared addressable object — not that local materialization disappeared.
[ADR-0014](0014-virtual-working-tree-and-sparse-checkout.md) and
[ADR-0032](0032-residency-native-sync-and-workspace-providers.md) already give
Epoch cheap materialization by residency, with truthful capability reporting.

A third observation shapes the constraint below. Delta's own
[agentic safety](https://delta.dev/docs/privacy-and-security/agentic-safety)
documentation states there is no agent permission framework, no agent sandbox,
and no mechanism preventing execution of shared worktree settings or
configuration. Delta's model has no seam where such a boundary would attach,
because "worktree" names both the shared object and the local folder. Epoch's
nomenclature holds residency, materialization, and execution apart precisely so
that seam exists. That separation must survive this ADR.

## Decision

Introduce `epoch.space/v1`. A **Space** is a signed, joinable object that
*composes* existing primitives and replaces none of them.

A Space references:

- exactly one **View**, fixing which repository history the Space is over;
- zero or more **Workspaces**, one per participant machine, each continuing to
  report its own residency, materialization, storage, and execution facts under
  ADR-0032 — the Space never reports on their behalf;
- a **conversation**, carried as existing Community receipts and Code
  Operations with optional conversation digests, not as a new message store;
- a **participant set** of **Principals** holding attenuated **Grants** and
  **Budgets** under [ADR-0034](0034-agent-principals-grants-and-budgets.md),
  which is how joining, agent authority, and revocation are all expressed; and
- a per-turn **Sandbox** binding recording where an agent turn actually ran.

Space events are signed like every other Epoch event. The emitted schema names
are `space.created`, `space.participant.joined`, `space.participant.left`,
`space.workspace.bound`, `space.turn.recorded`, `space.budget.allocated`,
`space.capture.opened` / `.operation` / `.closed`, and `space.anchor.recorded`;
`epoch space create / join / leave / bind / turn` are the CLI operations that
produce them. Joining a Space is receiving a signed grant and synchronizing
over the shipped `epoch.sync/v2` and gossip planes; it is not a server-side
access-control-list mutation.

### What a Space is not

Stated as prominently as what it is, because the vocabulary is already dense
and because collapsing these is the specific mistake this ADR exists to avoid.

- A Space is **not a View**. It references one; the View remains the only thing
  that selects history.
- A Space is **not a Workspace**. Workspaces stay provider-owned, per-machine,
  and individually truthful about what they materialized.
- A Space is **not a Sandbox**. Binding a turn to a Sandbox records where
  execution happened; it grants no isolation the provider did not declare.
- A Space is **not a Change or a Change Graph**. Work promoted out of a Space
  becomes Changes and Revisions through the existing path.
- A Space is **not authority**. Grants are. Membership in a Space confers
  exactly the grants issued, and revoking a grant is what removes access.
- A Space does **not** imply copy-on-write, a mount, or execution isolation.
  Any such capability is reported by the provider that actually has it.

### Consent-gated continuous capture

Epoch's [nomenclature](../nomenclature.md) currently disclaims continuous
capture of editor and terminal activity, and this ADR does not reverse that.
Instead a Space may carry a signed **capture session**: `session.open` declares
scope, retention, and redaction policy; while it is open, Code Operations may
be recorded continuously; `session.close` seals it. Code Operations outside a
session remain explicit. This reaches Delta's authoring fidelity without silent
capture, and makes the consent itself a verifiable artifact.

### Anchors

Conversation anchors to `(RevisionId, structural path)` using the structural
paths `@epoch/semantic` already produces, resolved forward through the Change
Graph — not to an operation identifier. A structural path re-resolves after
reformatting, renaming, and rebasing, whereas an operation anchor names a
historical position that must be replayed to interpret.

## Implementation Status (2026-08-13)

Shipped in `@epoch/protocol` (`epoch.space/v1` event schemas, the `space`,
`sandbox`, and `anchor` ID kinds), `@epoch/core` (`SignedSpaceStore`), and the
`epoch space ...` CLI family, with unit, CLI-envelope, and Gherkin coverage:

- **Phase 1 — Space object and join.** `space.created`,
  `space.participant.joined/left`, `space.workspace.bound`, and
  `space.turn.recorded`. Joining issues a grant; leaving revokes it in the same
  event; turns are refused without a live grant, past an allocated budget, and
  for `observer` grants. Binding routes through
  `createWorkspaceStateManifest()`, so a Space cannot claim isolation or
  copy-on-write the provider never declared.
- **Phase 2 — Consent-gated capture.** `space.capture.opened/operation/closed`.
  Captured operations outside an open session are refused with `policy-denied`.
- **Phase 3 — Structural anchors.** `space.anchor.recorded` plus
  `resolveAnchor()`, reporting `resolved`, `moved`, or `unresolved` against
  `@epoch/semantic` structural paths.

Not built, and not claimed: **Phase 4** (mount/hydration provider), **Phase 5**
(isolated execution provider), **Phase 6** (federated Space discovery and join).
Until Phase 5 lands, a per-turn Sandbox binding records where a turn ran; it
does not enforce a boundary, and the docs say so.

## Alternatives Considered

**Rename View or Workspace to Space.** Rejected. Both terms are load-bearing
contracts with shipped behavior, and reusing either would reintroduce exactly
the conflation that leaves Delta unable to describe a worktree trust boundary.

**Adopt a DeltaDB-shaped continuous worktree CRDT as the primary model.**
Rejected as the primary model. CRDT convergence is a property about replicas,
not about programs: a converged worktree can be text-valid and semantically
wrong with no artifact recording that anyone disagreed.
[ADR-0031](0031-durable-conflicts-and-conservative-commutation.md) commits
Epoch to durable conflicts and to refusing unknown commutation as permission.
CRDT entities remain available for the surfaces where convergence is the
correct semantics.

**Build a hosted Space service as the authority.** Rejected. It would trade
Epoch's structural advantage — local-first, offline-verifiable, exportable —
for the category Delta already occupies with better funding. A hosted seed is a
convenience under ADR-0022; it is never authority.

**Do nothing and rely on Community channels plus Views.** Rejected. That is the
current state, and it is the state in which no second person can join a piece
of in-progress work without either a forge round trip or an out-of-band folder.

**Ship a FUSE/ProjFS mount first.** Rejected as a starting point. It is the
most infrastructure per unit of user-visible benefit, and ADR-0014's virtual
materialization plus ADR-0032's chunk manifests and promises already make
joining cheap by residency. The mount belongs behind the Space object, as an
opt-in provider that reports `execution: none`.

## Consequences

Positive:

- Epoch gains the joinable-space ergonomic without a new storage substrate, a
  hosted authority, or a filesystem capability claim it cannot support.
- Agent participation in a shared space is expressible as attenuated grants,
  budgets, and per-turn receipts — the governance a shipping competitor
  documents as absent.
- Anchors, conflicts, and residency all keep their existing, stricter
  semantics; the Space is additive.

Trade-offs:

- One more term in a vocabulary that is already dense. The "what a Space is
  not" section is mandatory reading, not commentary.
- Consent-gated capture is less frictionless than always-on capture, and it
  does not by itself solve the signal-to-noise problem that public commentary
  raises about operation-level history.
- Per-turn Sandbox binding is only as meaningful as the execution providers
  that exist. Until an isolated provider ships, the binding records a fact
  rather than enforcing a boundary, and must be described that way.

## Revisit Criteria

Revisit this decision if:

- an isolated execution provider ships, making the per-turn Sandbox binding
  enforcing rather than descriptive;
- a mount provider ships, and residency-based joining stops being the cheapest
  correct default;
- DeltaDB publishes a stable external storage, signature, or migration contract
  sufficient for a fidelity adapter, which the
  [dossier](../competition/change-graph-vcs-dossier.md) currently records as
  absent; or
- capture sessions prove unusable in practice and continuous capture must be
  reconsidered on its own terms.

## Related Documents

- [Delta Workspace Convergence Analysis](../competition/delta-workspace-convergence.md)
- [Change Graph And Operation-History Dossier](../competition/change-graph-vcs-dossier.md)
- [ADR-0014: Virtual Working Tree And Sparse Checkout](0014-virtual-working-tree-and-sparse-checkout.md)
- [ADR-0031: Durable Conflicts And Conservative Commutation](0031-durable-conflicts-and-conservative-commutation.md)
- [ADR-0032: Residency, Native Sync, And Workspace Providers](0032-residency-native-sync-and-workspace-providers.md)
- [ADR-0034: Agent Principals, Grants, And Budgets](0034-agent-principals-grants-and-budgets.md)
- [Epoch Nomenclature](../nomenclature.md)
