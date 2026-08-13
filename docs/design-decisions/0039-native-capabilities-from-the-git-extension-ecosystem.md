# ADR-0039: Native Capabilities From The Git Extension Ecosystem

Status: Accepted (design); staged implementation

## Context

ADR-0037 gives Epoch an extension mechanism. That immediately raises the harder
question: what should *not* be an extension.

Git's ecosystem is a list of things Git should have shipped. Each popular
extension marks a place where the core model left capability on the table, and
users paid for it in install friction, configuration, and fragmentation. Three
separate projects exist to make stacked changes usable. Two exist to store large
files. The best everyday improvement to Git is a pager replacement.

Most of those tools are compensating for a model limitation Epoch does not have.
Git needs `git-absorb` to guess which commit a fix belongs to because commits
have no stable identity; Epoch has stable `ChangeId`s. Git needs Git Town and
git-spice to reconstruct branch parentage because branches are unrelated
pointers; Epoch has a Change Graph. Git needs `git-filter-repo` to rewrite
history destructively because there is no way to record that a rewrite happened;
Epoch has signed events.

Adopting a capability natively is therefore not "porting a tool". It is
recognizing that the tool's *problem* is already solved by Epoch's model and the
missing piece is the surface.

## Decision

Capabilities are sorted into four dispositions. The test for **native** is:
does Epoch's model already make this cheap, correct, or safer than the Git
version? If yes, shipping it as an extension is a defect.

### Native — the model already implies them

| Ecosystem source | Epoch native capability | Why native, and what improves |
|---|---|---|
| delta | Rendered diff output by default | A pager should not be an install step. `epoch diff` renders syntax-aware, themed, optionally side-by-side output using DESIGN.md tokens. No `core.pager` ritual. |
| difftastic | `epoch diff` structural mode (ADR-0038 L3) | Difftastic is a viewer and cannot emit a patch. Epoch emits a *structural patch* keyed by node path that still applies after reformatting. |
| Mergiraf | Structural merge in Merge Plans (ADR-0038) | Conflicts scoped to structural paths make ADR-0031 durable conflicts survive reformatting and rebasing — the property that makes them worth signing. |
| git-absorb | `epoch absorb` | Git infers a target commit from patch commutativity and writes a `fixup!` marker to be squashed later. Epoch has stable Changes, so absorption targets a Change directly and appends a Revision. There is no marker commit and no deferred squash step. |
| git-branchless smartlog | `epoch log --smart` | A graph-shaped log is the natural view of a Change Graph, not an alternate porcelain over refs. |
| git-branchless undo | `epoch undo` | Already latent: `.epoch/operations/` records local Operations for recovery. The capability exists; the surface is missing. |
| git-branchless restack | `epoch graph restack` | Reparenting after an ancestor is revised is a Change Graph edge operation, not a rebase loop. |
| Git Town, git-spice | `epoch graph` (append, prepend, swap, combine, set-parent, submit) | Stacked work is the Change Graph's native shape. Note the nomenclature boundary: Epoch has no `stack` command. "Stack" stays reserved for external stacked-branch projections such as Graphite. |
| git-cliff | `epoch changelog` | Derived from signed Changes with attributed, verifiable authorship rather than parsed commit subjects, with configurable templates and Conventional Commits parsing retained. |
| git-extras | `epoch summary`, `epoch release`, `epoch cleanup` | A grab bag of missing commands is evidence of missing surface, not of a needed plugin. |
| git-filter-repo | `epoch rewrite` | The genuine improvement: Git rewriting silently invalidates every published hash. Epoch records a **signed rewrite mapping** event, so old IDs still resolve and the rewrite is auditable rather than a rupture. Builds on existing redaction support. |
| Git LFS, git-annex | Blob subsystem (ADR-0015, ADR-0016, ADR-0018) | Already native by design: content-defined chunking, signed Merkle manifests, storage descriptors, external pointers, and availability states. LFS pointer files and annex symlink trees are workarounds for an object store that cannot express partial residency. Epoch's can. |
| git-fuzzy | `epoch pick` | The underrated middle ground: interactive selection over Changes, Revisions, and hunks without adopting a full TUI. Feeds `absorb`, `graph`, and `bundle`. |
| git rerere | Structural reusable resolutions | Already present as reusable conflict resolutions, upgraded by ADR-0038 to key on structural signature so a resolution survives whitespace and formatting change. |
| git-subrepo | `epoch compose` | Subrepo beats submodules because downstream users see ordinary directories. Epoch can do better than both: composition is a declared projection with signed provenance for the composed range, not a vendored copy that loses its origin. |

### Extension — genuinely pluggable, correctly external

Grammar-backed syntax providers (tree-sitter and equivalents), language-specific
merge drivers, domain entity adapters, forge- and vendor-specific codecs, and
organization-specific policy or changelog templates. These are unbounded sets
with per-language or per-vendor lifecycles. They register through the ADR-0037
capability registry against the same interfaces the builtins implement, so a
grammar-backed provider can displace a builtin without a fork.

### Deliberately not adopted

`git-crypt`-style transparent file encryption via clean/smudge filters is not
made native. Its own documentation lists metadata leakage and the inability to
revoke access to already-distributed content. Epoch has principals, attenuated
grants, and budgets (ADR-0034); secrets belong to that model or to an external
secret manager, not to a content filter that encrypts bytes while leaking
structure and cannot revoke. This is a capability boundary, not an oversight.

### The general rule

**A capability that changes repository content, history, or evidence should be
native and recorded. A capability that adapts Epoch to an external language,
vendor, or house style should be an extension.**

Git violates the first half — merge drivers and filters silently shape content
with no record. That is the specific mistake ADR-0037's mandatory provenance
exists to prevent.

## Consequences

Epoch's builtin surface is substantially larger than Git's, which is the
intent: the ecosystem list is a specification of what users needed and had to
install. The cost is a larger maintained surface and a real risk of builtins
that are worse than the extensions they preempt. Two mitigations: every native
capability listed here is implemented *on* the ADR-0037 registry rather than
beside it, so an extension can displace any of them; and `epoch ext list`
reports shadowing rather than hiding it.

This ADR is a disposition map, not a delivery commitment. Capabilities listed as
native are staged behind their own feature coverage, and none may be described
as shipped in `docs/features.md` before it has executable coverage.

## Revisit Criteria

Revisit a native disposition when a community extension demonstrably outperforms
the builtin on the same corpus, or when a capability's per-language surface
grows unbounded and belongs in the extension tier instead.

## Related

- [ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md)
- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [ADR-0034](0034-agent-principals-grants-and-budgets.md)
- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [ADR-0038](0038-semantic-diff-merge-and-compression.md)
- [Epoch Nomenclature](../nomenclature.md)
