# Semantic Content Pipeline

Epoch compares, merges, and stores content by structure rather than by lines.
The decision is
[ADR-0038](design-decisions/0038-semantic-diff-merge-and-compression.md); the
engine is the browser-safe `@epoch/semantic` package.

## Why not lines

Git's foundational assumption is that a change is a bag of text-line
insertions and deletions. Everything downstream inherits it. A reformat looks
like a rewrite. A moved function looks like a delete plus an unrelated insert.
A merge conflicts because two people edited adjacent lines, not because they
disagreed. A conflict recorded at `lines 4-7` stops meaning anything once the
file is reformatted. Two revisions sharing a thousand identical functions share
no storage.

Epoch's differentiator is that diffs, conflicts, and merges are signed
evidence. Evidence should describe what changed semantically, not where bytes
moved.

## The representation ladder

Each level is a total function on content and falls back to the level below.
The level actually used is recorded in the artifact.

| Level | Representation | Unit of change |
|---|---|---|
| L0 | Bytes | Byte range |
| L1 | Lines | Line hunk (`diffLines`, `formatUnifiedDiff`) |
| L2 | Tokens | Token run |
| L3 | Syntax tree | Node insert/delete/update/move/rename/reorder |
| L4 | Entities | Domain record (`EntityAdapter`) |

## Structural paths

A node's structural path is the sequence of `kind[:name]` steps from the root.
Unnamed nodes fall back to `kind#index`, counting only unnamed same-kind
siblings, so inserting a named sibling does not renumber unnamed ones.

```text
object#0/member:version/string#0
declaration:parseToml/declaration:visit
```

Paths survive reindentation, reformatting, and unrelated edits elsewhere in the
file. Line numbers do not. Every artifact below is keyed by structural path.

## Syntax providers

A provider maps source text to a typed tree. Providers register under the
`syntax` capability of the [extension registry](extensions.md), and builtins
and extensions implement the same interface.

| Provider | Language | Fidelity |
|---|---|---|
| `epoch.syntax.json` | JSON | grammar |
| `epoch.syntax.toml` | TOML subset | heuristic |
| `epoch.syntax.markdown` | Markdown heading tree | heuristic |
| `epoch.syntax.delimiter` | Brace-delimited languages | heuristic |

The delimiter provider recovers block structure for TypeScript, C-family,
Rust, Go, and friends **without a grammar**. It is a better-than-lines default
that gives declaration-level granularity, and it is expected to be displaced by
grammar-backed providers shipped as extensions. It must not be described as a
parser.

Displacement is a design contract with the seam in place, not a shipped
capability: `createSyntaxRegistry` accepts extension providers, but nothing
loads one yet, so every `epoch semantic` invocation today resolves to a
builtin. See the [implementation status](extensions.md#the-two-tiers) note and
[ADR-0044](design-decisions/0044-sandboxed-capability-providers.md).

The TOML provider covers the subset Epoch's own config uses. It refuses
`[[array.of.tables]]` headers and multi-line `"""`/`'''` strings outright
rather than mis-modelling them, because a wrong tree here becomes a patch that
silently corrupts the file.

## Semantic diff and structural patch

`semanticDiff` returns edits over structural paths, with kinds `insert`,
`delete`, `update`, `move`, `rename`, and `reorder`.

```console
$ epoch semantic diff a.json b.json
diff --epoch-semantic b.json
level syntax provider epoch.syntax.json language json
base 52b5eaf4… result 6740a2a5…
update object#0/member:version/string#0
```

The diff names the changed value rather than the surrounding lines. A pure
permutation of declarations is a single `reorder`, not N deletes and N inserts.

Whitespace is content, not noise: a structural patch is signed evidence, so
applying one must reproduce exactly what was reviewed. Reformatting a container
is therefore reported faithfully, as one update on that container rather than
as a line-by-line rewrite — it is not silently discarded. Formatting-blindness
lives where it is safe: patches apply onto reformatted targets, and conflict
identity and reusable resolutions normalize whitespace.

Unlike difftastic, the result is a **patch, not a view**. Because it is keyed
by path, it still applies after the target has been reformatted:

```console
$ epoch semantic diff a.json b.json --json > p.json
$ epoch semantic apply densely-formatted.json p.json
{"name":"epoch","version":"0.2.0"}
```

A unified diff built against the original layout would reject there.

When no provider matches the content, the pipeline degrades to the existing
unified diff and records `level lines`.

## Semantic merge

Three-way merge runs over the tree:

- **Disjoint subtrees never interact.** Two contributors editing different
  functions merge cleanly no matter how close the edits are in the file.
- **Commutative containers merge independent insertions.** A provider marks a
  node kind commutative — object literals, dependency tables, import blocks.
  Two sides adding different keys is a merge, not a conflict. This is bounded
  by [ADR-0031](design-decisions/0031-durable-conflicts-and-conservative-commutation.md):
  commutation is claimed only when both application orders produce the
  identical canonical result, and `semanticMerge(base, left, right)` is
  byte-identical to `semanticMerge(base, right, left)`.
- **Genuine disagreement stays a conflict.** The merged output is left at base
  for the conflicted construct rather than guessed at.

Conflicts are scoped to a structural path, not a line range:

```text
conflict edit-edit at declaration:alpha signature=…
```

That is what makes ADR-0031's durable conflicts actually durable — the conflict
still identifies the same construct after a reformat or a rebase.

Each conflict carries a **formatting-insensitive signature** over the
normalized base, left, and right text. Reusable conflict resolutions key off
that signature, so an Epoch-native rerere generalizes across whitespace and
formatting instead of missing on it.

## Semantic compression

Compression is a storage-layer concern and never changes object identity.
`blobSha256` remains SHA-256 over whole plaintext content and `verify()`
continues to re-hash whole content.

1. **Syntax-guided chunking.** FastCDC picks boundaries from a rolling hash
   over bytes, so an indentation change reshuffles every subsequent boundary.
   `chunkBySyntax` snaps boundaries to node edges and groups by **node count,
   not byte threshold** — a size threshold would make boundaries depend on
   formatting again. Reindenting a file leaves the boundary set unchanged,
   which keeps the chunk-level dedup that
   [ADR-0015](design-decisions/0015-large-file-and-blob-handling-options.md)
   and [ADR-0016](design-decisions/0016-entity-aware-streaming-and-targeted-checkout.md)
   depend on stable.
2. **Subtree dedup.** `dedupeSubtrees` content-addresses declarations rather
   than whole blobs, so a function appearing in two files or moving between
   revisions is stored once. This is Git's tree-level sharing pushed down to
   declaration granularity.
3. **Derived dictionaries.** `deriveDictionary` builds a preset compression
   dictionary from the repository's own frequent token sequences. Derivation is
   deterministic and the dictionary is content-addressed, so decompression is
   reproducible from repository state alone.
4. **Semantic deltas.** `encodeSemanticDelta` stores content as a structural
   patch against a base, so the stored delta is proportional to semantic change
   rather than formatting churn.

`semantic plan` takes a mixed set and groups it by resolved provider, so it can
be pointed at a repository rather than at one language (ADR-0046):

```console
$ epoch semantic plan src/*.ts package.json tsconfig.json docs/*.md pnpm-lock.yaml
provider epoch.syntax.delimiter  files 42  chunks 310  saved 21102
provider epoch.syntax.json  files 2  chunks 18  saved 224
provider epoch.syntax.markdown  files 11  chunks 74  saved 900
unplanned pnpm-lock.yaml  (no syntax provider matches 'pnpm-lock.yaml')
dictionary 512 entries digest a1b2c3… (derived across all 56 files)
plain 118430 bytes  after subtree dedup 96204 bytes (saved 22226)
```

Three properties make that more than a loop over providers. Dedup keys are
scoped by the provider that produced them, so identical text parsed under two
grammars is two entries rather than a false share — cross-language storage
sharing is real, but it belongs to the byte layer, not to a table keyed by
structural identity. The dictionary spans every group, including files no
provider claimed, because cross-language repetition is precisely the redundancy
it exists to capture. And files no provider matches are reported as `unplanned`
rather than dropped, since a storage estimate that quietly ignores the lockfile
is the estimate that misleads someone.

`@epoch/semantic` is browser-safe and performs no byte-level entropy coding. It
produces the boundaries, dedup table, dictionary, and delta that a host codec
then encodes.

## Boundaries

Epoch does not claim Pijul's patch theory, difftastic's grammar coverage, or
Mergiraf's language matrix. It claims one representation ladder that diff,
merge, conflict identity, and storage all share, with the level used recorded
as evidence.

Structural paths are stable under formatting but not under arbitrary
refactoring. Renaming an enclosing declaration relocates its descendants'
paths, and the diff reports that as a rename plus moves rather than pretending
nothing happened.

## Commands

See the [CLI Reference](cli.md) for `epoch semantic diff`, `apply`, `merge`,
and `plan`.
