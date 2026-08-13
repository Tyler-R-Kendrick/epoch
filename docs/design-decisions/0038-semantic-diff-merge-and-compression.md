# ADR-0038: Semantic Diff, Merge, And Compression

Status: Accepted (design); staged implementation

## Context

Epoch's current content pipeline is line-oriented end to end. `diffLines()`
computes an LCS over arrays of strings, `formatUnifiedDiff()` renders hunks at
line offsets, `TextWeaveCRDT` merges by grouping overlapping line hunks, and
`chunkFastCdc()` cuts content-defined chunks over raw bytes. Blobs are stored
uncompressed; the sync-v2 handshake advertises `identity` only.

That pipeline inherits Git's foundational assumption: **a change is a bag of
text-line insertions and deletions**. Everything downstream is shaped by it. A
reformat looks like a rewrite. A moved function looks like a delete plus an
unrelated insert. A merge conflicts because two people edited adjacent lines,
not because they disagreed. A conflict recorded at `lines 4-7` stops being
meaningful the moment the file is reformatted. Two revisions that share a
thousand identical functions share no storage.

The Git ecosystem has been attacking this from four directions at once, and the
progression is instructive:

- **delta** improves presentation of the line diff.
- **difftastic** compares syntax trees instead of lines, but cannot emit a
  patch — it is a viewer.
- **Mergiraf** merges syntax trees, resolving conflicts line merge cannot.
- **git-absorb** infers which historical patch a change belongs to.

Each step replaces a little more of "bag of lines" with structure, provenance,
and intent. Epoch should not bolt these on as extensions. Epoch's differentiator
is that diffs, conflicts, and merges are *signed evidence*, and evidence should
describe what changed semantically, not where the bytes moved.

Two constraints shape the decision. Verification must not change: SHA-256 over
whole content stays authoritative, and no semantic layer may become a second
source of truth. And the browser-safe boundary must hold: the semantic engine
runs in `@epoch/protocol`-style environments, so it takes no native
dependencies.

## Decision

Epoch adopts an explicit **representation ladder**. Each level is a total
function on content, each falls back to the level below, and the level actually
used is recorded.

| Level | Representation | Unit of change |
|---|---|---|
| L0 | Bytes | Byte range |
| L1 | Lines | Line hunk (today's behavior) |
| L2 | Tokens | Token run |
| L3 | Syntax tree | Node insert/delete/update/move/rename/reorder |
| L4 | Entities | Domain record (existing `EntityAdapter` surface) |

### Syntax providers

L3 is supplied by a `SyntaxProvider`, registered through the ADR-0037
capability registry under the `syntax` capability. A provider maps source text
to a `SyntaxTree` of typed nodes carrying kind, optional name, child list, and
source span.

Node identity is the load-bearing design choice. A node's **structural path** is
the sequence of `kind[:name]` steps from the root, with positional indices used
only for unnamed siblings. `fn:parseToml > block > if:0` survives reindentation,
reordering of named siblings, and edits elsewhere in the file. Line numbers do
not. Every semantic artifact below is keyed by structural path.

Epoch ships dependency-free builtin providers: `json`, a TOML subset matching
the config parser, `markdown` (heading tree), and a generic balanced-delimiter
provider that recovers usable block structure for C-family, TypeScript, Rust,
and Go without a grammar. Real grammars — tree-sitter and friends — are exactly
the case ADR-0037's extension mechanism exists for, and they register against
the same interface the builtins use.

### Semantic diff and structural patch

`semanticDiff(before, after, provider)` returns `SemanticEdit[]` over structural
paths, with edit kinds `insert`, `delete`, `update`, `move`, `rename`, and
`reorder`. Move and rename detection is the point: a function relocated across a
file is one `move`, not a delete and an insert a thousand lines apart.

Unlike difftastic, the result is a **patch, not a view**. A structural patch is
keyed by structural path, so it still applies after the target has been
reformatted, reindented, or had unrelated siblings inserted — the cases where a
line-offset patch fails. When no provider matches the content, the patch
degrades to the existing unified diff, and the patch header records which level
produced it.

### Semantic merge

Three-way merge runs over the tree:

- Edits in disjoint subtrees merge without interaction, regardless of proximity
  in the file. Adjacent-line collisions stop being conflicts.
- A provider may declare a node kind a **commutative container** — import
  blocks, `use` lists, object literals, dependency tables. Independent
  insertions into a commutative container merge by canonical ordering instead of
  conflicting. This is bounded by ADR-0031's rule: commutation is claimed only
  when both application orders produce the identical canonical result, and
  ambiguity stays a conflict.
- A conflict is scoped to a **structural path**, not a line range. It therefore
  survives reformatting and rebasing, which is what makes ADR-0031's durable
  conflicts actually durable.

Reusable conflict resolutions key off the structural signature of the three
sides rather than a hash of their text. An Epoch-native rerere consequently
generalizes across formatting changes instead of missing on whitespace.

### Semantic compression

Compression is a storage-layer concern and never changes object identity.
`blobSha256` remains SHA-256 over whole plaintext content; `verify()` continues
to re-hash whole content. Four mechanisms, in increasing specificity:

1. **Syntax-guided chunking.** FastCDC picks cut points from a rolling hash over
   bytes, so an indentation change reshuffles every subsequent boundary. When a
   syntax provider matches, boundaries snap to node edges instead. Chunk
   identity then tracks structure, and reformatting stops invalidating the
   chunk-level dedup that ADR-0015 and ADR-0016 depend on.
2. **Subtree dedup.** Content-address syntax subtrees, not just whole blobs. A
   function that appears in two files, or moves between revisions, is stored
   once. This is Git's tree-level sharing pushed down to function granularity.
3. **Derived dictionaries.** Deflate a corpus of many small source objects
   against a preset dictionary derived deterministically from the repository's
   own frequent token sequences. The dictionary is itself a content-addressed
   object referenced by the compressed object, so decompression is reproducible
   from repository state alone.
4. **Semantic deltas.** Store a revision's content as a structural patch against
   a base subtree rather than a byte delta, so the stored delta is proportional
   to semantic change rather than to formatting churn.

Every compressed object records its codec descriptor and dictionary object ID.
An object whose codec is unavailable is a *missing* object with a stated reason,
never a silently corrupt one.

## Consequences

Moves and renames stop dominating diffs, and reformatting stops dominating
conflicts and storage. Conflicts and reusable resolutions gain a stable
identity that survives the churn that currently invalidates them. Structural
patches apply in cases where line patches reject.

The costs are explicit. Parsing is more expensive than splitting on newlines, so
L3 is opt-in per content type and always falls back. Structural paths are stable
under formatting but not under arbitrary refactoring; a renamed enclosing
function relocates its descendants' paths, and the diff reports that as a rename
plus moves rather than pretending nothing happened. The builtin
balanced-delimiter provider recovers block structure, not real grammar, and must
not be described as one — it is a better-than-lines default, and grammar-backed
providers are expected to displace it through the registry.

Epoch does not claim Pijul's patch theory, difftastic's grammar coverage, or
Mergiraf's language matrix. It claims a common representation ladder that diff,
merge, conflict identity, and storage all share, with the level used recorded as
evidence.

### Whitespace is content

One consequence deserves stating plainly, because it cuts against the obvious
expectation. A structural patch is signed evidence, so applying it must
reproduce exactly what was reviewed. Formatting changes are therefore recorded
faithfully rather than discarded: reformatting a container reports one update
on that container, not nothing. A diff that silently dropped whitespace would
mean the reviewed content and the applied content could differ.

Formatting-blindness is granted only where it is safe — patches apply onto
reformatted targets, conflicts are scoped to structural paths, and reusable
resolutions key on whitespace-normalized signatures. Epoch does not claim a
whitespace-blind diff, and difftastic remains the better tool for *viewing* a
reformatted change.

## Revisit Criteria

Revisit when a grammar-backed provider ships as a trusted extension and its
structural-merge accuracy can be measured against the builtin provider on the
same corpus, or when subtree dedup measurably regresses object-store locality. Also revisit
if a whitespace-blind reporting mode can be added without weakening the
guarantee that an applied patch reproduces the reviewed content.

## Related

- [ADR-0015](0015-large-file-and-blob-handling-options.md)
- [ADR-0018](0018-blob-subsystem-reference-architecture.md)
- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [ADR-0039](0039-native-capabilities-from-the-git-extension-ecosystem.md)
- [Semantic Content Pipeline](../semantic-pipeline.md)
