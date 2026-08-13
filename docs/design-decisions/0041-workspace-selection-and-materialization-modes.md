# ADR-0041: Workspace Selection, Materialization Modes, And The Namespace Manifest

Status: Accepted and implemented. `lazy` materialization currently behaves like
`explicit` because no provider can hydrate on access yet; that gap is stated
below rather than hidden.

## Context

[ADR-0014](0014-virtual-working-tree-and-sparse-checkout.md) named its behavior
"sparse checkout". It is not one. `epoch checkout --virtual` writes the files
that *differ from a base view* and leaves identical files virtual. A sparse
checkout writes the files the user *selected*, whether or not they changed.
The difference is user-visible:

- an unchanged dependency needed to build the selected component stays absent;
- a changed path irrelevant to the current task is written anyway;
- two contributors on the same View cannot hold different component cones; and
- `.epoch/checkout.json` still enumerates every path even when almost nothing is
  materialized.

Two different concepts are also carrying overlapping names. The workspace
manifest provider records "selected paths"
([ADR-0032](0032-residency-native-sync-and-workspace-providers.md),
[Workspace Providers](../workspace-providers.md)) while the CLI calls its
changed-path set "virtual".

Git needed sparse checkout *and* sparse index because a flat index stayed
proportional to every file at HEAD; Sapling reached the same conclusion with
on-demand trees. Epoch's promises solved missing bytes and left missing metadata
unsolved, so `O(total paths)` manifests are the next ceiling. Jujutsu also
demonstrates the right ownership: sparse patterns belong to a workspace, and
each workspace may inherit or override them.

Full analysis is in
[Repository Composition And Workspace Selection](../repository-composition-and-selection.md).

## Decision

**Workspace Selection is a first-class, workspace-local concept.** A Selection
answers only "which resources in this composed namespace are relevant to this
Workspace?" It is local state by default, so a backend developer, a UI
developer, a CI worker, and an agent can hold different selections over the same
repository state without writing history. Named profiles may be signed
Repository configuration, but *applying* a profile remains local.

The v1 grammar is deterministic and order-independent: `all`, `path` with
`self` or `recursive` depth, plus `union`, `intersection`, `difference`, and
`profile`. This mirrors the set algebra already used by Views without conflating
the domains — Views select history, Selections select the projected namespace.
Order-dependent gitignore-style patterns are rejected, and cone mode's implicit
inclusion of ancestor-sibling files is rejected: a profile inherits required root
manifests explicitly.

Semantic selectors (component, build target, dependency closure, ownership,
entity type) arrive later as **untrusted provider proposals** that declare
provider identity and version, bind input digests, resolve to canonical paths,
entities, Repository Links, and object IDs, and produce a deterministic
`ResolvedSelection` digest. Core never depends on an external build tool,
package manager, or model. A resolved Selection then drives sync filters,
promise generation and resolver routing, Repository Link traversal, workspace
manifests, hydrate, status and diff, browser and IDE indexing, optional
build-dependency closure, and agent disclosure boundaries.

**Materialization becomes a named mode, separate from Selection.**

| Mode | Meaning |
|---|---|
| `eager` | Materialize every resource in the resolved Selection immediately. |
| `explicit` | Describe the selected namespace and promises; materialize only via `hydrate`. |
| `lazy` | Materialize on access through a capable provider (future work). |
| `delta` | Materialize resources differing from a specified base — today's `--virtual`. |

`checkout --virtual` becomes a deprecated alias for `--materialization delta`.
The behavior ADR-0014 shipped is kept, correctly named, and stops being
described as sparse checkout. Delta materialization remains the right mode for
reviewing a Change or View, overlaying against a separately available base, and
shipping a compact modified set.

**A content-addressed Namespace Manifest replaces whole-namespace metadata.**
Versions and verifiable compacts gain a Namespace Manifest DAG whose directory
nodes are hash-addressed and canonically sorted, whose entries are files,
entity snapshots, directories, or Repository Links, and whose root digest is
bound by the signed Version or compact. The local index keeps complete entries
for selected paths and opaque subtree references elsewhere, so index size tracks
the Selection rather than the repository. The DAG is an acceleration and
verification structure, never a second history authority — the signed event
graph stays authoritative, and the DAG must be deterministically regenerable
from it.

Selection extends to CRDT entity snapshots, closing the ADR-0014 gap where only
file blobs participate in sparse selection.

**Selection composes across Repository Links.** When a Selection intersects a
mount path, resolve the link descriptor and exact child Version, translate the
remaining suffix through the link's `sourcePath`, resolve that translated
Selection against the child namespace DAG, emit repository-qualified promise
routes, and preserve ownership boundaries in the workspace manifest. When a
Selection excludes the mount path, retain only the link descriptor and fetch
nothing from the child. This is the integration Git leaves to the user, where
sparse checkout and submodule population are independent state machines.

**Diagnostics stay distinguishable.** A path that is absent reports whether it
was *excluded*, *promised*, *unauthorized*, *unavailable*, or *corrupt* —
preserving the ADR-0032 boundary between availability gaps and integrity
failures. Semantic selectors may not expand disclosure beyond a Principal's
grants ([ADR-0034](0034-agent-principals-grants-and-budgets.md)), and builds may
require a dependency-closed Selection and fail with the exact missing
dependencies rather than silently producing incomplete output.

## Consequences

Positive:

- "Which files do I want" and "which files changed" stop sharing a name, so
  partial checkouts can finally be organized around a component instead of a
  diff.
- Index and manifest size become proportional to the Selection, removing the
  metadata ceiling that promises did not address.
- Workspace-local selection lets agents receive task-scoped disclosure and lets
  browser workspaces navigate a large namespace from metadata alone.
- One resolved Selection feeds sync, residency, materialization, and link
  traversal, so a single artifact explains the whole workspace.

Trade-offs:

- `--virtual` gains an alias and a deprecation window, and existing docs,
  features, and CLI help must be re-worded away from "sparse checkout".
- The Namespace Manifest is new derived state that must stay verifiably
  regenerable, and binding its root into Versions and compacts touches
  evidence-bearing structures.
- A workspace-local Selection is not shared history, so reproducing a
  colleague's workspace requires exchanging a profile or resolved digest
  explicitly.
- Untrusted semantic selectors add a proposal/acceptance surface rather than
  simply calling a build tool.

## Revisit Criteria

Revisit this decision if:

- selection needs to become signed history rather than workspace-local state;
- `lazy` materialization through a kernel VFS/FUSE or browser filesystem handle
  becomes implementable, at which point explicit `hydrate` stops being the only
  truthful escape path;
- the Namespace Manifest needs to become authoritative rather than derived; or
- the deterministic v1 grammar proves insufficient before semantic provider
  selectors exist.

## Related Documents

- [Repository Composition And Workspace Selection](../repository-composition-and-selection.md)
- [ADR-0014: Virtual Working Tree And Sparse Checkout](0014-virtual-working-tree-and-sparse-checkout.md)
- [ADR-0032: Residency, Native Sync, And Workspace Providers](0032-residency-native-sync-and-workspace-providers.md)
- [ADR-0040: Repository Composition And Repository Links](0040-repository-composition-and-links.md)
- [Workspace Providers](../workspace-providers.md)
- [CLI Reference](../cli.md)
</content>
