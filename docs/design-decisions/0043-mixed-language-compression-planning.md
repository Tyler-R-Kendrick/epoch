# ADR-0043: Mixed-Language Compression Planning

Status: Proposed

## Context

`epoch semantic plan` resolves one syntax provider from the first input and
refuses the rest if they disagree:

```console
$ epoch semantic plan src/cli.ts package.json
semantic plan needs one syntax provider; 'package.json' does not use epoch.syntax.delimiter
```

Refusing is correct. Parsing `package.json` with the delimiter provider would
report chunk boundaries and dedup savings for a structure nobody understood,
and [ADR-0038](0038-semantic-diff-merge-and-compression.md) makes the recorded
level part of the evidence — a plan derived from a wrong parse is worse than no
plan.

But the consequence is that the command cannot be pointed at a repository. Real
repositories are mixed by definition: this one holds TypeScript, JSON, TOML, and
Markdown in every directory. A storage-planning tool that only accepts
single-language input answers a question nobody has.

The limitation is also in the wrong place. `planCompression` takes one provider
because it was written for one; nothing in the underlying operations requires
it. Chunking is per-source. Subtree dedup content-addresses declarations and has
no reason to care that one came from TypeScript and another from JSON — though
it does need to avoid claiming two identical byte sequences are the same
declaration when they were parsed under different grammars. Dictionary
derivation runs over raw text and is genuinely language-independent.

## Decision

**Group by resolved provider; plan per group; derive the dictionary across all
of them.**

`planCompression` takes sources and a provider *resolver* rather than a single
provider. It partitions the input by resolved provider, plans each partition
with the provider that understands it, and returns a plan whose parts are
addressable:

```console
$ epoch semantic plan src/*.ts package.json docs/*.md
provider epoch.syntax.delimiter  files 42  chunks 310
provider epoch.syntax.json       files  3  chunks  18
provider epoch.syntax.markdown   files 11  chunks  74
unplanned                        files  2  (no provider matches .lock)
dictionary 512 entries digest a1b2c3…  (derived across all 58 files)
plain 118430 bytes  after subtree dedup 96204 bytes (saved 22226)
```

Three properties make this more than a loop:

**Dedup keys carry their provider.** A subtree digest is scoped by the provider
that produced it, so identical text parsed under two grammars is two entries,
not a false share. Storage sharing across languages is a real opportunity, but
it belongs to the byte layer, not to a table keyed by structural identity.

**The dictionary spans every group.** Cross-language repetition is where a
derived dictionary earns its keep — an import path, a license header, a URL
recurs across `.ts`, `.json`, and `.md` alike. Deriving per group would discard
exactly the redundancy the dictionary exists to capture. Derivation stays over
raw text, so it needs no provider at all.

**Files no provider matches are reported, not dropped.** They appear as
`unplanned` with a count and a reason. A plan that silently omits inputs
overstates its own coverage, and a storage estimate that quietly ignores the
lockfile is the estimate that misleads someone.

Determinism carries over unchanged: groups are ordered by provider ID, sources
within a group by path, so the plan is byte-identical across clones that resolve
the same providers.

### The single-provider form stays

`planCompression(sources, provider)` remains, as the degenerate case of one
group. It is what the tests exercise directly and what a caller with a known
language should use; the resolver form is for callers that have a file list and
a registry.

## Consequences

`semantic plan` becomes usable on a repository, which is the only scale at which
its numbers mean anything — subtree dedup and dictionary derivation both improve
with corpus size, so the single-language restriction was suppressing the effect
being measured.

The reported plan gains structure, so consumers must read a grouped result
rather than a flat one. That is a breaking change to the JSON shape, made while
the command has no dependents.

Per-group planning does not reduce work; it is the same parsing, partitioned. A
repository-scale plan will be slower than a single-file one in proportion to
the corpus, and the command should stream progress rather than appear hung.

## Revisit Criteria

Revisit when a byte-layer codec can share content across provider boundaries, at
which point the provider-scoped dedup key becomes a limitation rather than a
protection; or when entity-level (L4) planning arrives and grouping should
follow entity type rather than syntax provider.

## Related

- [ADR-0015](0015-large-file-and-blob-handling-options.md)
- [ADR-0016](0016-entity-aware-streaming-and-targeted-checkout.md)
- [ADR-0038](0038-semantic-diff-merge-and-compression.md)
- [Semantic Content Pipeline](../semantic-pipeline.md)
