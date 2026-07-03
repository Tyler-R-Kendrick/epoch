# ADR-0016: Entity-Aware Streaming And Targeted Partial Checkout

Status: Accepted

## Context

Source control's primary job is **editing content**: a contributor opens the few
files they care about, changes them, and records the change. Epoch's storage,
however, is built around *whole* objects. Every file is a single SHA-256 blob
(`recordPatch`, `packages/Epoch.Core/src/core.ts`); `checkout` and
`version materialize` write whole files; and even ADR-0014's virtual working tree,
which can leave a file *unwritten*, still hydrates the **entire blob** the moment a
file is realized. There is no way to hold part of a file, to read the first
seconds of a video without the whole asset, or to edit one region of a large
binary without materializing all of it.

For large creative and media assets this is the dominant cost. The user's priority
is explicit: **let contributors make targeted edits without holding every file —
or every byte — in the repository.** ADR-0015 chose content-defined chunking with
signed Merkle manifests as the storage direction; this ADR builds the *working-copy
and editing* story on top of that substrate and adds the entity-aware streaming the
project wants.

The design is grounded in how other systems already solve partial residency and
streamed editing, now captured as competitor dossiers under
`../competition/products/`:

- **Game consoles stream large binary assets by declaring a minimum working set
  and hydrating the rest on demand.** Xbox
  [Streaming Install / Intelligent Delivery](../competition/products/xbox-series-x/design/design.md)
  marks a "launch chunk," verifies each block against a Microsoft-signed SHA-256
  hash tree while streaming, and decrypts only the regions a title touches; Sampler
  Feedback Streaming pushes this to sub-asset (texture-tile) residency.
  [Valve SteamPipe](../competition/products/valve-steampipe/design/design.md)
  reuses unchanged chunks across builds and lets a title play while depots download.
  [PlayStation PlayGo](../competition/products/playstation-playgo/design/design.md)
  declares "initial chunks" per scenario and reprioritizes chunk install at runtime.
- **Content-addressed distribution proves partial, verifiable residency works.**
  [BitTorrent v2](../competition/products/bittorrent/design/design.md) verifies any
  16 KiB block up to a per-file SHA-256 Merkle root;
  [Hypercore](../competition/products/hypercore-dat/design/design.md) signs the root
  of an append-only log and replicates only requested block ranges;
  [casync](../competition/products/casync/design/design.md) fetches only the chunks
  an index references and seeds from existing local data;
  [IPFS](../competition/products/ipfs/design/design.md) is the cautionary tale that
  content addressing is not content availability.
- **Partial-checkout VCS show the "only the files I need" spectrum.**
  [VFS for Git / Scalar](../competition/products/vfs-for-git/design/design.md)
  hydrates objects on first open and composes partial clone with cone
  sparse-checkout; [Git LFS](../competition/products/git-lfs/design/design.md)
  fetches selected paths and locks unmergeable binaries;
  [Snowtrack](../competition/products/snowtrack/design/design.md) exploits
  copy-on-write reflinks for near-instant large-binary checkout;
  [Diversion](../competition/products/diversion/design/design.md) markets
  working-set sync for TB-scale game repositories.

The seams this ADR extends already exist: ADR-0014's regenerable virtual working
tree (`checkout.json`, `hydrate`), ADR-0015's chunk manifests and chunk-range
transport, the `EntityAdapter`/`entity_type` dispatch
(`packages/Epoch.Core/src/crdt.ts`) that already keys behavior off MIME type, and
the `redaction` path for sanctioned absence.

## Decision

Adopt an **entity-aware, chunk-granular working-copy model** in which a contributor
can check out, stream, and edit *parts* of large assets without materializing whole
files or the whole repository. Five parts:

1. **Chunk-granular partial residency.** Extend ADR-0014's virtual working tree from
   whole-file to *sub-file*: a materialized file may be **partially resident**, with
   missing chunk ranges hydrated lazily on read — the VFS-for-Git hydrate-on-open,
   casync-seed, and Xbox decrypt-on-access-region pattern. A **targeted checkout**
   resolves a view to its manifests and fetches only the chunks a requested path (or
   byte range) needs, over ADR-0015's chunk-range transport. `checkout.json` records
   per-chunk residency; the still-virtual ranges regenerate on demand and stay a
   cache excluded from `verify`.

2. **Entity-aware streaming adapters.** Extend the `EntityAdapter`/`entity_type` seam
   to declare a per-type **storage-and-streaming strategy**, not just merge/diff:
   **segment-aligned chunking for video** on GOP/keyframe boundaries so a player can
   range-fetch and begin playback à la HLS/DASH (the residency idea behind Xbox
   Sampler Feedback Streaming); FastCDC for generic binary; whole-blob for small
   mergeable `text/*`/`application/json` so CRDT entities are unaffected.

3. **Chunk-level live editing.** An edit to a region re-chunks **locally** with
   FastCDC over the touched window, producing new content-addressed chunks and a new
   **signed manifest**; only the changed chunks are written and synced (the SteamPipe
   delta, restic, and Xet model). "Live-editing streaming chunks" is exactly this:
   edit against a partially-resident asset, hydrate only the touched regions, and
   commit a manifest delta — a record/intent event whose blob reference is the new
   manifest, unchanged in shape from ADR-0015.

4. **Binary-edit safety.** Unmergeable entity types opt into **exclusive locks**
   (the Perforce `+l`, Git LFS lock, and Plastic lock-rule model) expressed as
   **signed lifecycle events**, so "who holds the edit token" is auditable repository
   state rather than server-side session state; where the filesystem supports it,
   use copy-on-write reflinks (Snowtrack) for fast local materialization.

5. **Availability and verifiability stay total.** Generalize `redaction` from whole
   blobs to **chunk ranges**, so a sanctioned-absent region is signed evidence rather
   than corruption; keep `verify` total (each chunk hash → the signed manifest root →
   the full-content hash); and treat availability as explicit
   (pinning/seed/backup-origin over ADR-0003 transport tiers) — the IPFS lesson — and
   **never** address content by a partial or sampled hash — the Kazaa/UUHash
   pollution lesson.

## Consequences

Positive:

- Contributors edit and stream large assets while holding only the chunks they
  touch; a fresh checkout of a terabyte view can materialize gigabytes.
- Video and other streamable media become first-class through the adapter seam
  instead of special cases, and playback/preview no longer require full download.
- Editing stays efficient and verifiable: a local re-chunk emits a signed manifest
  delta, `verify` remains total, and event/version schemas are unchanged (the blob
  reference is still `{ blob_sha256, size, entity_type }`, now a manifest hash).
- The model reuses existing seams (virtual working tree, chunk transport, entity
  adapters, redaction) rather than adding a parallel subsystem.

Trade-offs:

- A real lazy-hydration handle (virtual-filesystem or explicit range `hydrate`) is
  more machinery than today's whole-file realize, and per-`entity_type` streaming
  adapters (a video segmenter especially) are non-trivial; unknown types fall back
  to generic FastCDC and whole-file hydrate.
- Chunk-range residency and chunk-range redaction add bookkeeping to `checkout.json`
  and the redaction path.
- Exclusive locks introduce a coordination concept Epoch has so far avoided; it is
  opt-in per entity type and expressed as ordinary signed events, but it is new
  policy surface.

## Revisit Criteria

Revisit this decision if:

- lazy on-access hydration cannot be made portable enough (a bespoke virtual
  filesystem per platform proves necessary), echoing the VFS-for-Git → Scalar
  retreat toward partial clone plus sparse-checkout;
- entity-aware segmenters do not pay for themselves and generic FastCDC plus
  explicit `hydrate` covers the real workloads;
- signed exclusive locks prove too weak (no enforcement without a coordinating peer)
  or too heavy for the collaboration model; or
- chunk-range redaction or residency bookkeeping proves materially harder than the
  whole-blob equivalents.

## Related Documents

- [ADR-0014: Virtual Working Tree And Sparse Checkout](0014-virtual-working-tree-and-sparse-checkout.md)
  — the regenerable-cache + `hydrate` layer this ADR extends to sub-file granularity.
- [ADR-0015: Large-File And Blob-Handling Options](0015-large-file-and-blob-handling-options.md)
  — the content-defined chunking, signed manifest, and chunk-range transport substrate.
- [ADR-0003: Competitive Gap Design Options](0003-competitive-gap-design-options.md)
  — pluggable transport tiers and blob-availability guardrails.
- [Current Design](../design.md) — working-tree model, `entity_type`, and redaction.
- Competitor dossiers:
  [Xbox Series X|S](../competition/products/xbox-series-x/design/design.md),
  [Valve SteamPipe](../competition/products/valve-steampipe/design/design.md),
  [PlayStation PlayGo](../competition/products/playstation-playgo/design/design.md),
  [BitTorrent](../competition/products/bittorrent/design/design.md),
  [IPFS](../competition/products/ipfs/design/design.md),
  [Hypercore (Dat)](../competition/products/hypercore-dat/design/design.md),
  [casync / desync](../competition/products/casync/design/design.md),
  [Git LFS](../competition/products/git-lfs/design/design.md),
  [VFS for Git / Scalar](../competition/products/vfs-for-git/design/design.md),
  [Diversion](../competition/products/diversion/design/design.md),
  [Snowtrack (SnowFS)](../competition/products/snowtrack/design/design.md).
