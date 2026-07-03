# ADR-0018: Blob Subsystem Reference Architecture

Status: Accepted

## Context

[ADR-0015](0015-large-file-and-blob-handling-options.md) chose Epoch's large-file **shape** —
content-defined chunking with signed Merkle manifests, delivered through a storage-descriptor seam,
with chunk-range transport and entity-aware chunking — and [ADR-0016](0016-entity-aware-streaming-and-targeted-checkout.md)
chose the **working-copy and editing** model on top of it. Both are options-and-decision records
that, by the house rule, "commit to a shape, not a build sequence." Neither is a single integrated
picture of *how the pieces compose* or *where each one attaches to the code that exists today*.

This ADR is that picture: a **reference architecture** that consolidates ADR-0015 and ADR-0016 into
one layered design, maps every layer onto an existing Epoch seam, and shows how the whole satisfies
the project's design goals. It is **not a new decision** and does not re-open ADR-0015/0016; it
operationalizes them. It is backed by the
[Blob And Large-File Gap Analysis](../blob-large-file-gap-analysis.md), which enumerates the residual
gaps each layer below is responsible for closing. Consistent with ADR-0015, it commits to
architecture and integration structure, not to a delivery timeline: each layer lands independently,
with its own code and feature coverage, when it is built.

The two axes ADR-0015 weights above all others still govern: **storage/transfer efficiency** and
**preservation of the trust model** (signed, content-addressed, totally verifiable). The posture is
unchanged: *transport moves bytes; verification decides whether bytes are acceptable.*

The seams this architecture attaches to already exist:

- the reference triple `{ blob_sha256, size, entity_type }` and `StorageName.blobs` in
  `packages/Epoch.Core/src/domain.ts`;
- `recordPatch`/`recordFile`, `verifyBlobReference`/`verify`, `redactBlob`, the
  `EpochTransport`/`BundleEpochTransport`/`exportToMemoryTransport` surface, `checkoutView`/`hydrate`,
  and the hook system in `packages/Epoch.Core/src/core.ts`;
- the `EntityAdapter`/`EntityRegistry` dispatch in `packages/Epoch.Core/src/crdt.ts`;
- the regenerable virtual working tree (`checkout.json`, `patches/`) from
  [ADR-0014](0014-virtual-working-tree-and-sparse-checkout.md);
- the `StorageBackend` seam in `packages/Epoch.Core/src/ha/backup.ts` and `blobsForEvents` in
  `ha/compact.ts`; and
- the `redaction` path for sanctioned absence.

## Decision

Adopt the following layered reference architecture. Layers are numbered L0–L7 by dependency, not by
priority; each is independently verifiable.

### L0 — Reference model and storage descriptor (the keystone)

Generalize the reference to `{ blob_sha256, size, entity_type, storage? }`, where `storage` is an
**additive, optional** descriptor selecting how the bytes are obtained: `inline` (today's whole
blob), `chunk-manifest` (L1), or `external-pointer` (L7). `blob_sha256` **always** binds the full
content, so identity and verification are independent of `storage`. The descriptor is canonicalized
into the signed event, so it is tamper-evident, not advisory. Readers **fail closed** on an unknown
`storage` kind. Events with no `storage` mean `inline`, so all existing history keeps working
unchanged. This is the single structural change that lets every other layer evolve while the event,
intent, and version payload **shapes** stay fixed (ADR-0015 Option 5).

*Attaches to:* the Zod `Schemas` on `record`/`file.*`/`intent`/`version` in `domain.ts`.

### L1 — Chunker, chunk store, and signed manifest

Split a blob with a content-defined chunker (FastCDC/Gearhash, ~64 KB expected chunk) so boundaries
follow content. Content-address each chunk; store chunks under `.epoch/blobs/chunks/`. Emit a
**manifest** — itself a content-addressed blob under `.epoch/blobs/manifests/` — recording the
ordered `{ chunk_sha256, offset, length }` list, the total length, the full-content `blob_sha256`,
the `entity_type`, and a **versioned chunker descriptor** (algorithm id + pinned min/avg/max,
normalization, and seed/polynomial). The chunker parameters are part of the format and must be
pinned and versioned (the restic/casync/Borg lesson). The manifest is authenticated transitively:
the signed event binds `blob_sha256`, the descriptor resolves to the manifest, and the manifest
binds every chunk.

*Attaches to:* `recordPatch`/`recordFile` in `core.ts` (chunk-writing path); a new manifest
serializer beside the existing blob writer.

### L2 — Loose-vs-pack tiering and garbage collection

Keep small blobs whole and loose (today's cheap path); promote only large or cold blobs to chunked
storage, and aggregate many chunks into **pack objects** under `.epoch/blobs/packs/` with an
assembly `index` (the restic/Xet-xorb model; the Fossil/Perforce loose-vs-pack precedent). Define a
**promotion policy** (size/coldness threshold) and **chunk/pack garbage collection** by reachability
from signed events, with redaction and compacts as first-class roots (restic prune; OSTree
refs-as-roots). Small text stays trivially verifiable and CRDT-mergeable; chunking cost is paid only
where it earns its keep.

*Attaches to:* `blobsForEvents`/compaction in `ha/compact.ts`; a new pack/index writer and a GC pass.

### L3 — Chunk-range transport

Replace `exportToMemoryTransport`'s base64-everything snapshot with a **have/want negotiation** over
the `EpochTransport`/`BundleEpochTransport` contract: exchange heads, then the missing **manifests**,
then the missing **chunks**. Every transferred chunk is hash-checked on arrival, so an untrusted
relay can carry bytes without being trusted (casync/S3 range GET/OCI zstd:chunked show the transfer
unit; the negotiation is the new work). Partial and resumable sync fall out for free. **Ordering
rule:** chunk plaintext first, then compress/encrypt per chunk, so boundary-shifting dedup survives
compression and any future encryption (the Borg/restic ordering lesson).

*Attaches to:* `EpochTransport` / `MemoryEpochTransport` / `BundleEpochTransport` in `core.ts`.

### L4 — Entity-aware storage and streaming strategy

Extend the `EntityAdapter`/`EntityRegistry` dispatch — which today selects merge/diff/display — to
also select a **storage-and-streaming strategy** per `entity_type`: FastCDC for generic
`application/octet-stream`; **keyframe/segment-aligned chunking for video** (cut on GOP boundaries so
an HLS/DASH-style player can range-fetch and begin playback); whole-blob for small `text/*` and
`application/json` so CRDT merge is untouched. Unknown types fall back safely to generic CDC.

*Attaches to:* `EntityRegistry.defaults()`/`register()` and the `EntityAdapter` interface in
`crdt.ts`.

### L5 — Chunk-granular working-copy residency and mount

Extend ADR-0014's virtual working tree from whole-file to **sub-file** residency: a materialized file
may be **partially resident**, with missing chunk ranges hydrated lazily on read. A **targeted
checkout** resolves a view to its manifests and fetches only the chunks a requested path or byte
range needs, over L3. `checkout.json` records per-chunk residency; still-virtual ranges regenerate on
demand and remain an unsigned cache excluded from `verify`. An optional **lazy-hydration mount**
(VFS/FUSE handle) is the natural consumer, kept optional because portability is unresolved (the
VFS-for-Git→Scalar caution).

*Attaches to:* `checkoutView`/`hydrate` and the `VirtualCheckout*` schemas; `checkout.json`.

### L6 — Live editing and binary-edit safety

An edit to a region **re-chunks locally** over the touched window, producing new content-addressed
chunks and a new **signed manifest**; only changed chunks are written and synced. The commit is an
ordinary `record`/`intent` event whose blob reference is the new manifest — unchanged in shape from
L0. Unmergeable entity types opt into **exclusive locks** expressed as **signed lifecycle events**
(the Perforce/Git-LFS/Plastic model, and Borg's append-only single-writer lock), so "who holds the
edit token" is auditable repository state rather than server session state. Where the filesystem
supports it, use copy-on-write **reflinks** (Snowtrack) for fast local materialization.

*Attaches to:* the record/intent append path; a new signed lock event type alongside the existing
`file.*` lifecycle events.

### L7 — Availability, chunk-range redaction, and external pointer

Generalize `redaction` from whole blobs to **chunk ranges**, so a sanctioned-absent region is signed
evidence rather than corruption, and keep `verify` total (each chunk hash → the signed manifest root
→ the full-content hash). Treat **availability as explicit**: pinning, seed nodes, and backup-origin
tiers over ADR-0003's transport contract — the IPFS lesson that content addressing is not
availability, with Tahoe-LAFS erasure coding as durability prior art. Retain the **`external-pointer`**
descriptor as an **opt-in** for teams that want bytes on their own OCI registry or S3-compatible
store (range GET is already the chunk-range primitive), with the documented trade-off that
availability, GC, and redaction then live outside the signed store and those stores sign separately
or not at all. P2P swarm/CDN tiers (ADR-0015 Options 7/8) inherit L1's verifiable transfer unit if
pursued later; they are explicitly **not** part of this architecture and stay gated on redaction and
availability being solved first.

*Attaches to:* `redactBlob`/`verifyBlobReference` in `core.ts`; the `StorageBackend` seam in
`ha/backup.ts`; `epochObjectStoreService()` retention config in `Epoch.Platform.Web`.

## Integration map

| Layer | Seam (file) | Change |
|---|---|---|
| L0 | `domain.ts` reference `Schemas` | Add optional canonicalized `storage` descriptor; fail-closed reader rule |
| L1 | `core.ts` `recordPatch`/`recordFile` | CDC chunk-write path + signed manifest writer; new `chunks/`, `manifests/` dirs |
| L2 | `ha/compact.ts` `blobsForEvents`; new pack/index/GC | Pack aggregation, assembly index, promotion policy, chunk/pack GC roots |
| L3 | `core.ts` `EpochTransport`/`BundleEpochTransport` | have/want negotiation replacing base64 `exportToMemoryTransport`; chunk-then-encrypt ordering |
| L4 | `crdt.ts` `EntityRegistry`/`EntityAdapter` | Per-`entity_type` storage/streaming strategy; video segmenter; text stays whole-blob |
| L5 | `core.ts` `checkoutView`/`hydrate`; `checkout.json` | Per-chunk residency; targeted checkout; optional mount handle |
| L6 | record/intent append; new signed lock event | Local re-chunk → manifest delta; opt-in signed exclusive locks; reflink fast path |
| L7 | `core.ts` `redactBlob`/`verify`; `ha/backup.ts` `StorageBackend` | Chunk-range redaction evidence; availability tiers; opt-in `external-pointer` |

## Design-goal alignment

| Design goal (ADR-0001 + weighted axes) | How this architecture satisfies it |
|---|---|
| Immutability by default | Chunks and manifests are immutable, content-addressed objects; edits append new chunks + a new signed manifest, never mutate |
| Identity without authority | Authorship stays in the signed event that binds `blob_sha256`; no registry or server becomes authoritative for content |
| Offline-first / self-contained clone | `inline` and `chunk-manifest` keep all bytes local; a clone stays self-contained; `external-pointer` is the only opt-out and is opt-in |
| Progressive enhancement | Small text keeps the trivial whole-blob path; chunking, streaming, mount, and locks are added only where they earn their keep |
| No unnecessary complexity | One additive optional field (L0); loose-vs-pack keeps the common case cheap; no blockchain, CA, or always-on node |
| Extensibility (storage adapters first-class) | Rides existing seams — `EntityRegistry`, `EpochTransport`, `StorageBackend`, hooks — rather than a parallel subsystem |
| Storage/transfer efficiency (weighted) | Global cross-file/version dedup; incremental hash/I/O; base64 transport wall retired by L3; a one-byte edit touches a few chunks |
| Trust model preserved (weighted) | `verify` stays total (manifest → chunks → full-content hash); `blob_sha256` unchanged; redaction still governs sanctioned absence |

**Non-goals reconciliation.** [Current Design](../design.md) lists "no delta sync" and "no shallow
clones" among current non-goals. Chunk-range transfer is **not** text-delta sync (no unified-diff
chains to walk) and targeted checkout is **not** a shallow clone (history stays complete; only file
*bytes* are fetched on demand). When any of L1–L7 lands with code, that non-goals list is updated to
describe the shipped behavior precisely.

## Backward compatibility and migration

- Events with no `storage` descriptor are `inline`; all existing repositories and history keep
  working with no rewrite (L0 is additive).
- Payload **shapes** for `record`, `intent`, and `version` do not change, so history stays
  byte-for-byte comparable and compacts/backups remain valid.
- Migration is opportunistic: large or cold `inline` blobs are promoted to `chunk-manifest`/packs by
  the L2 policy; `verify` handles both representations because `blob_sha256` is unchanged.
- Unknown future `storage` kinds fail closed, so old readers never silently accept bytes they cannot
  verify.

## Consequences

Positive:

- Large assets stop re-uploading and re-hashing whole; dedup becomes global across files and
  versions; the base64 transport wall is removed at L3.
- The trust model is unchanged from the outside: one hash still names one file's content, `verify`
  stays total, and redaction still governs sanctioned absence.
- Streaming, targeted checkout, and mount become expressible as per-`entity_type` policy over one
  chunk substrate rather than special cases; the deferred P2P/CDN tiers inherit a ready-made
  verifiable transfer unit.
- The change reuses existing seams (reference triple, entity registry, transport, virtual working
  tree, redaction) instead of adding a parallel subsystem.

Trade-offs:

- New machinery to build and maintain: a pinned/versioned chunker, chunk packing, an assembly index,
  chunk/pack GC, have/want negotiation, and chunk-range redaction evidence.
- A second storage path (loose vs. packed) and a promotion policy to tune.
- `verify` does more work per large blob (manifest + N chunk hashes), mitigated by incremental,
  cacheable verification.
- Entity-aware video segmentation requires container-format awareness; unknown types fall back to
  generic CDC.
- Exclusive locks and a portable mount introduce coordination and platform concerns Epoch has so far
  avoided; both are opt-in.

## Architectural layering (explicitly not a delivery roadmap)

The layers form a dependency order, so the architecture can be realized incrementally without a
committed schedule. Per the house rule, each lands only with its own code and feature coverage:

L0 descriptor seam → L1 CDC + manifest + verify (loose) → L2 packs + GC → L3 chunk-range transport →
L4 entity adapters / streaming → L5 partial residency / mount → L6 live editing + locks → L7
availability + chunk-range redaction; external-pointer and P2P later.

L0 is the keystone: it is small and additive, and it unblocks every later layer without changing
payload shapes.

## Illustrative feature-scenario sketches

These sketch the user-visible behavior each layer will need to prove; they are illustrative here and
become executable `features/*.feature` specs when the corresponding code lands (they are intentionally
**not** added as executable specs by this ADR).

- *Record a large asset with chunk-manifest storage.* Given a file above the promotion threshold,
  when it is recorded, then it is stored as content-defined chunks plus a signed manifest, and
  `verify` re-proves the manifest, each chunk, and the reassembled full-content hash.
- *Sync only the missing chunks.* Given a peer that already holds most chunks, when repositories
  sync, then only missing manifests and chunks transfer, each is hash-checked on arrival, and no
  base64 whole-blob snapshot is built.
- *Targeted checkout of one asset.* Given a view over a terabyte of assets, when a contributor checks
  out one path, then only that path's chunks hydrate, unrelated files stay virtual, and `checkout.json`
  records per-chunk residency.
- *Edit a region of a large binary.* Given a partially resident asset under an exclusive lock, when a
  contributor edits one region, then only the touched window re-chunks, a new signed manifest is
  recorded, and unchanged chunks are reused.
- *Sanctioned chunk-range absence.* Given a signed chunk-range redaction, when `verify` runs, then the
  absent range is accepted as signed evidence and the rest of the blob still verifies total.

## Revisit Criteria

Revisit this architecture if:

- measured dedup on real asset workloads does not beat whole-file storage enough to justify the
  chunking machinery (fall back to L2 tiering, or whole-file for small repositories);
- chunk/pack garbage collection or chunk-range redaction evidence proves materially harder than the
  whole-blob equivalents;
- a portable lazy-hydration mount cannot be built without a bespoke per-platform filesystem (retreat
  to targeted checkout + explicit `hydrate`, echoing VFS-for-Git → Scalar);
- signed exclusive locks prove too weak (no enforcement without a coordinating peer) or too heavy for
  the collaboration model; or
- demand for bytes-on-external-infrastructure makes the `external-pointer` descriptor common enough to
  warrant first-class availability and redaction handling despite its weaker local-first guarantees.

## Related Documents

- [ADR-0015: Large-File And Blob-Handling Options](0015-large-file-and-blob-handling-options.md) — the
  option analysis and the decision this architecture operationalizes.
- [ADR-0016: Entity-Aware Streaming And Targeted Checkout](0016-entity-aware-streaming-and-targeted-checkout.md)
  — the working-copy and editing model realized in L4–L6.
- [ADR-0014: Virtual Working Tree And Sparse Checkout](0014-virtual-working-tree-and-sparse-checkout.md)
  — the regenerable cache + `hydrate` layer L5 extends to sub-file granularity.
- [ADR-0003: Competitive Gap Design Options](0003-competitive-gap-design-options.md) — pluggable
  transport tiers and blob-availability guardrails.
- [ADR-0001: Design Philosophy And Inspiration](0001-design-philosophy-and-inspiration.md) — the
  principles the design-goal alignment maps against.
- [Blob And Large-File Gap Analysis](../blob-large-file-gap-analysis.md) — the residual gaps each
  layer closes.
- [Current Design](../design.md) — object store, redaction semantics, and non-goals.
- Competitor dossiers:
  [Hugging Face Xet](../competition/products/hugging-face-xet/design/design.md),
  [restic](../competition/products/restic/design/design.md),
  [BorgBackup](../competition/products/borgbackup/design/design.md),
  [casync / desync](../competition/products/casync/design/design.md),
  [OSTree](../competition/products/ostree/design/design.md),
  [OCI Registry / ORAS](../competition/products/oci-oras/design/design.md),
  [Amazon S3 / MinIO](../competition/products/s3-minio/design/design.md),
  [Perkeep](../competition/products/perkeep/design/design.md),
  [Tahoe-LAFS](../competition/products/tahoe-lafs/design/design.md),
  [BitTorrent](../competition/products/bittorrent/design/design.md),
  [Hypercore (Dat)](../competition/products/hypercore-dat/design/design.md),
  [Git LFS](../competition/products/git-lfs/design/design.md),
  [VFS for Git / Scalar](../competition/products/vfs-for-git/design/design.md),
  [Snowtrack (SnowFS)](../competition/products/snowtrack/design/design.md),
  [Perforce P4](../competition/products/perforce-p4/design/design.md),
  [Fossil](../competition/products/fossil-scm/design/design.md).
- [CLI Reference](../cli.md) · [SDK Reference](../sdk.md) · [Feature Registry](../features.md)
