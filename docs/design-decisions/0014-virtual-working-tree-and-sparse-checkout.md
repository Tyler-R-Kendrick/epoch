# ADR-0014: Virtual Working Tree And Sparse Checkout

Status: Accepted

## Context

Working with an Epoch repository has, until now, meant expanding every tracked
file of a view onto disk. `epoch checkout` and `epoch version materialize` read
each content-addressed blob and write the whole file, and `epoch import`
materializes an entire Git tree. This is wasteful when a contributor only wants
to preview or work on the handful of files a view actually changes, and it makes
"see what this branch changes" an expensive, whole-tree operation.

Epoch already keeps everything needed to avoid this. `projectRecords` folds the
signed event log into a `path -> {blob, size}` map, so the full shape of a view
is known without writing a single byte. Blobs stay content-addressed and
deduplicated, and `verify` re-hashes them. What was missing was a way to write
*only the changed files* to the working tree and describe the rest virtually —
an analog of Git sparse-checkout over a virtual filesystem.

## Decision

Epoch adds a **virtual working tree** layer over checkout and materialization.
It is a working-tree concern only: the object store (`.epoch/blobs/`) continues
to hold whole, content-addressed, signed-and-verifiable blobs, unchanged.

- **Materialization mode.** `checkout` resolves a mode of `virtual` or `full`.
  `full` is the previous behavior (write every file). `virtual` writes only the
  files whose blob differs from a base view; files identical to the base stay
  virtual (not written). With no base (for example the parent-less `main`), no
  files are pulled until requested.
- **Default at init.** `epoch init`/`create` write `[working_tree]
  materialization = "virtual"` into `.epoch/config.toml` (guarded so an existing
  config is never clobbered). The compiled default remains `full`, so a bare
  in-memory repository is unaffected; only initialized repositories default to
  virtual.
- **Regenerable local cache.** A virtual checkout writes `.epoch/checkout.json`
  (every path with `blob_sha256`, `size`, and `virtual`/`materialized` status)
  and a rolling aggregate unified diff at `.epoch/patches/<hash>.patch`
  (`base -> view`, recomputed as the frontier advances). These artifacts are a
  cache, like `views.json` and `.epoch/compacts/`. They are **not** signed and
  are deliberately excluded from `verify`; if deleted they regenerate.
- **New surfaces.** `epoch preview` prints the rolling aggregate diff without
  materializing; `epoch hydrate [PATH...]` realizes virtual files from the
  object store; `epoch checkout --full` is the always-correct escape hatch.
  `epoch version materialize --base REF` writes only the files a version changes
  relative to another version/view, alongside an `epoch-virtual.json` manifest.
  `epoch status` reports still-virtual paths with a `V` marker instead of
  treating them as deleted.

## Consequences

Positive:

- "Don't pull every file": a fresh checkout can leave the working tree sparse,
  saving disk while the full tree remains fully described by the manifest.
- Previewing a view's changes is a cheap, first-class operation, and the rolling
  patch is squashed by construction (`base -> current`, not per-step).
- The change is additive and low-risk: history stays byte-for-byte verifiable,
  and reconstruction always falls back to reading a blob.

Trade-offs:

- The manifest and patch files are working-tree state that can drift from disk
  across successive checkouts. They are treated strictly as a cache keyed on
  `frontier + view + base`, with `checkout --full` and `hydrate` as reconciliation.
- Rolling patches render text blobs as unified diffs and binary blobs as a
  `Binary files … differ` marker; a base or blob that is missing degrades a hunk
  to an addition rather than failing.
- Entity (CRDT) snapshots in `version materialize` are always written; only file
  blobs participate in sparse selection today.

## Revisit Criteria

Revisit this decision if:

- the object store itself should store deltas instead of whole blobs (a future,
  isolated change to `recordPatch`/`verifyBlobReference` that can reuse the
  unified-diff applier this layer already ships);
- virtual state needs to survive as signed history rather than a local cache;
- sparse selection should extend to CRDT entity snapshots; or
- lazy, on-access hydration (a real virtual filesystem handle) is needed instead
  of explicit `hydrate`.

## Related Documents

- [CLI Reference](../cli.md)
- [SDK Reference](../sdk.md)
- [Current Design](../design.md)
- [Feature Registry](../features.md)
