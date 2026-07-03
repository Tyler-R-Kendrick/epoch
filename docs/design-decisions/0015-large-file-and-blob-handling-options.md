# ADR-0015: Large-File And Blob-Handling Options

Status: Accepted

## Context

Epoch stores every recorded file as a single whole blob, named by the SHA-256
of its full bytes, in a flat content-addressed object store at `.epoch/blobs/`.
The write path reads the entire file into memory, hashes the whole buffer in one
shot, and writes it atomically as one file (`recordPatch` in
`packages/Epoch.Core/src/core.ts`). Every content-bearing event carries the same
reference triple — `{ blob_sha256, size, entity_type }` — across `record`,
`file.copy`/`file.move`, `intent` patches, and `version` file/entity manifests
(`packages/Epoch.Core/src/domain.ts`). Verification re-reads each blob and
recomputes its hash (`verifyBlobReference`, `verify`), and a `redaction` event is
the one sanctioned way a blob may be legitimately absent.

This model keeps the trust story simple and total: one hash binds one file, and
`verify` re-proves the whole repository byte for byte. It is a poor fit for large
binary assets — machine-learning checkpoints, video, and game or film source
files:

- **No sub-file dedup.** A one-byte change to a large file mints a brand-new full
  blob; nothing is shared with the previous revision or with a similar sibling
  file.
- **Whole-file memory pressure.** Recording, reading, and hashing all load the
  entire file into memory at once.
- **A transport wall.** `exportToMemoryTransport` base64-encodes *every* blob into
  a single in-memory snapshot, and `sync`/`gossip` copy whole blob files. There is
  no partial, ranged, or delta transfer. Epoch's own non-goals already list "no
  delta sync" and "no shallow clones."
- **No streaming or partial access.** ADR-0014's virtual working tree can leave a
  file unwritten, but any realization still hydrates the whole blob; there is no
  way to read the first seconds of a video or a single region of a large asset.

The only current guardrail is `working_tree.max_new_file_bytes`, which *rejects*
oversized files rather than handling them. Epoch already carries the seams a
better story would build on: the `entity_type` tag on every blob reference and
the `EntityAdapter` dispatch that keys merge/diff/display behavior off it
(`packages/Epoch.Core/src/crdt.ts`); ADR-0014's precedent of a regenerable,
unsigned cache with on-demand `hydrate`; ADR-0003's pluggable `EpochTransport`
tiers; and ADR-0001's principle that "storage adapters are first-class extension
points."

This ADR catalogs the design space for large-file handling and selects a
direction. Following the house rule that roadmap and implementation land only
once they have code and feature coverage, this is an options-and-decision record
in the spirit of [ADR-0003](0003-competitive-gap-design-options.md); it commits
to a shape, not a build sequence. The comparison uses the repository's competitor
dossiers under `../competition/products/` and the
[inspiration archive](0001-design-philosophy-and-inspiration.md).

Two axes are weighted above the others when choosing: **storage and transfer
efficiency** (kill the whole-file re-upload and the in-memory transport wall) and
**preservation of Epoch's trust model** (signed, content-addressed, totally
verifiable — even when blobs are large, chunked, remote, or streamed).

## Options

The options are grouped by the decision they answer. They are largely
composable — the recommendation stacks several — rather than mutually exclusive.

### Axis 1 — Blob representation in the object store

**Option 1 — Status quo: whole-file content-addressed blobs.** Keep one blob per
file, hashed and stored whole.

- *Take:* the simplest possible verification (`blob_sha256` = hash of the bytes),
  no assembly step, trivial garbage collection.
- *Avoid:* no sub-file dedup, O(filesize) work per edit, whole-file memory and
  transport. This is the baseline every other option is measured against.

**Option 2 — Content-defined chunking with signed Merkle manifests.** Split each
blob with a rolling hash (FastCDC / Gearhash, ~64 KB expected chunk) so that
boundaries shift with content rather than offset; content-address each chunk;
aggregate chunks into pack objects; and store a **manifest** — itself a
content-addressed blob — listing the ordered chunk hashes, offsets, and total
length. This is the
[Hugging Face Xet](../competition/products/hugging-face-xet/design/design.md)
"xorb" lineage, applied to Epoch's own CAS.

- *Take:* cross-file and cross-version dedup; a small edit re-uploads only the
  handful of chunks that changed; chunks are the natural unit of ranged transfer
  and streaming; hashing and I/O become incremental. Crucially, verification stays
  total — verify the manifest hash, then each chunk hash, then that the reassembled
  length and full-content hash match.
- *Avoid:* an assembly/index layer, chunk-level garbage collection, and a rolling
  hash that must be pinned and versioned (the chunker parameters become part of the
  format). Boundary-shifting dedup is weaker on compressed or encrypted inputs whose
  bytes change globally.

**Option 3 — Delta / packfile chains.** Store each large blob as a delta against a
prior similar blob, packed git-style. This is the path ADR-0014's revisit criteria
already names ("the object store itself should store deltas instead of whole
blobs … reuse the unified-diff applier this layer already ships").

- *Take:* excellent for many near-identical revisions of the same file; reuses the
  diff/patch machinery Epoch already has.
- *Avoid:* delta chains must be walked and rebuilt to read (poor random and
  streaming access), dedup is pairwise against a chosen base rather than global, and
  binary deltas of media are often near-worthless. Weaker than Option 2 on exactly
  the axes we weight.

**Option 4 — Loose-vs-pack tiering.** Keep small blobs whole (Option 1) and
promote only large or cold blobs into chunked packs (Option 2), the way
[Fossil](../competition/products/fossil-scm/design/design.md) and
[Perforce](../competition/products/perforce-p4/design/design.md) separate loose
and packed storage.

- *Take:* pay the chunking/assembly cost only where it earns its keep; the common
  case of small text stays trivially verifiable and CRDT-mergeable.
- *Avoid:* two code paths and a promotion policy to tune. In practice this is not a
  rival to Option 2 but the *deployment shape* of it.

### Axis 2 — Blob reference model in events

**Option 5 — Storage-descriptor indirection.** Generalize the reference so a blob
is `{ blob_sha256, size, entity_type, storage? }`, where `storage` selects how the
bytes are obtained: `inline` (today's whole blob), `chunk-manifest` (Option 2), or
`external-pointer` (Option 11). `blob_sha256` **always** binds the full content, so
verification and identity are unchanged regardless of storage; the manifest or
pointer is a resolution detail beneath a stable hash.

- *Take:* one additive, optional field unlocks Options 2, 6, and 11 **without
  changing the shape** of any `record`, `intent`, or `version` payload. Old events
  (no `storage`) mean `inline`. This is the seam that lets efficiency evolve while
  the trust model holds still — the single most important structural choice here.
- *Avoid:* the descriptor must be canonicalized into the signed event (so it is
  tamper-evident, not just advisory), and every reader must handle an unknown
  `storage` kind conservatively (fail closed).

### Axis 3 — Distribution and transport

**Option 6 — Chunk-range pluggable transport.** Extend the `EpochTransport` /
`BundleEpochTransport` contract (the seam ADR-0003 Option 2 introduced) to
negotiate heads, then exchange only the *missing chunks and manifests* rather than
whole blobs — replacing `exportToMemoryTransport`'s base64-everything snapshot.

- *Take:* removes the in-memory transport wall, gives partial/resumable sync for
  free, and makes "fetch just what this view needs" cheap. Every transferred chunk
  is hash-checked on arrival, so an untrusted relay can carry bytes without being
  trusted — Epoch's stated posture that "transport moves bytes, verification decides
  whether bytes are acceptable."
- *Avoid:* a real negotiation protocol (have/want sets) instead of a file copy, and
  chunk availability accounting.

**Option 7 — Peer-to-peer swarm distribution.** Distribute chunks over a
BitTorrent-style swarm — the lineage of Kazaa and LimeWire. Content-addressed
chunks are natural swarm pieces, the Merkle manifest is the torrent info-dictionary
analog, and seed nodes (à la
[Radicle](0001-design-philosophy-and-inspiration.md)) provide baseline
availability.

- *Take:* horizontal scale and resilience for popular assets with no origin
  bottleneck; verification is intrinsic because every piece is fetched by hash.
- *Avoid:* peer discovery, NAT traversal, availability/pinning, and abuse control —
  exactly the operational weight ADR-0003 flags ("blob availability needs careful
  partial-sync behavior"; treat redaction as a prerequisite before any public
  relay). A layer to add once chunking exists, not a foundation.

**Option 8 — Integrated peer-to-peer CDN with edge tiers.** Combine an
authoritative seed, a peer cache, and edge points of presence into availability
tiers, mudstack-style, all serving the same verifiable chunks.

- *Take:* production-grade delivery latency for creative-asset teams while keeping
  content-addressed verification end to end.
- *Avoid:* the most operational surface of any option; only sensible layered on
  Options 2/6/7 and driven by a real hosting story.

### Axis 4 — Access pattern and entity awareness

**Option 9 — Entity-aware storage and streaming via the adapter seam.** Extend the
`EntityAdapter`/`entity_type` dispatch — which today selects *merge/diff/display* —
to also select a *storage and access strategy*: FastCDC for generic
`application/octet-stream`; **keyframe/segment-aligned chunking for video** (cut on
GOP boundaries so an HLS/DASH-style player can range-fetch and begin playback
without the whole file); whole-blob for small `text/*` and `application/json` so
CRDT merge is untouched.

- *Take:* reuses a seam Epoch already owns; makes "stream this video, mount that
  dataset, keep that CSV mergeable" a per-type policy rather than a special case.
  Directly answers the entity-aware requirement.
- *Avoid:* container-format awareness (a video segmenter is real work) and a
  registry of per-type chunkers to maintain. Falls back safely to generic CDC for
  unknown types.

**Option 10 — Lazy, on-access hydration (mount).** Extend ADR-0014's virtual
working tree from explicit `hydrate` to a real virtual-filesystem handle that
ranges chunks on read — the mount workflow that
[Xet](../competition/products/hugging-face-xet/design/design.md),
[Perforce](../competition/products/perforce-p4/design/design.md), and
[Unity Version Control](../competition/products/unity-version-control/design/design.md)
offer for large repositories.

- *Take:* work against a terabyte view while touching gigabytes; the natural
  consumer of chunk-range transport.
- *Avoid:* a FUSE/VFS integration per platform. Depends on Options 2 and 6 to be
  worthwhile.

### Axis 5 — Blobs outside the signed store

**Option 11 — Coupled but separate artifact repository.** Do not store large bytes
inline at all. Epoch records a signed pointer event
(`{ blob_sha256, size, entity_type, locator }`) plus policy, while a tightly
integrated artifact store — a first-party service, or a reused OCI registry or
S3-compatible object store — holds the bytes and is presented as part of the DVCS.
This is the [Git LFS](../competition/products/dvc/design/design.md),
[DVC](../competition/products/dvc/design/design.md), and
[lakeFS](../competition/products/lakefs/design/design.md) lineage, expressed as an
`external-pointer` storage descriptor (Option 5).

- *Take:* the event log stays small and fast; operators can put bytes on
  infrastructure they already run; identity and integrity are still provable because
  the pointer carries the content hash.
- *Avoid:* this moves **availability, garbage collection, and redaction out of the
  signed local store** — the properties Epoch is built to keep local-first and
  total. A clone is no longer self-contained; `verify` can prove *what* a blob must
  be but not that you *have* it; the redaction guarantee now depends on an external
  system honoring deletes. It weakens exactly the trust axis we weight, so it belongs
  as an *opt-in* descriptor, not the default.

**Option 12 — External content-addressed networks (IPFS/CID).** Reference bytes by
CID on IPFS, as surveyed in
[bda-svc](../../.inspiration/bda-svc/README.md) and the
[inspiration archive](0001-design-philosophy-and-inspiration.md).

- *Take:* global dedup and a ready-made content-addressed transport.
- *Avoid:* ADR-0001 and the bda-svc writeup already record IPFS pinning/availability
  problems and "extreme operational complexity" as an anti-pattern. Documented for
  completeness and **not recommended.**

### Comparison

| Option | Storage/transfer efficiency | Trust model preserved | Streaming/partial | Operational cost |
|---|---|---|---|---|
| 1 Whole-file (status quo) | Poor | Total, trivial | None | Minimal |
| 2 CDC + signed manifests | Strong (global dedup) | Total (chunk + manifest hashes) | Natural | Moderate |
| 3 Delta chains | Good for near-dupes | Total, but walk-to-read | Poor | Moderate |
| 4 Loose-vs-pack tiering | Strong where it matters | Total | Via packs | Moderate (two paths) |
| 5 Storage descriptor | Enabler | Preserved (hash unchanged) | Enabler | Low (additive field) |
| 6 Chunk-range transport | Strong (kills base64 wall) | Total (verify on arrival) | Enabler | Moderate (protocol) |
| 7 P2P swarm | Strong at scale | Total (fetch by hash) | Via chunks | High (discovery/abuse) |
| 8 P2P CDN / edge | Strongest delivery | Total | Yes | Highest |
| 9 Entity-aware + video | Strong, type-tuned | Total | Yes (segment-aligned) | Moderate (segmenters) |
| 10 Mount / lazy hydrate | Transfer-optimal | Total | Yes | High (per-platform VFS) |
| 11 External artifact repo | Strong (log stays small) | **Partial** (availability/GC/redaction leave the store) | Depends on store | Moderate |
| 12 IPFS/CID | Good | Partial + anti-pattern | Via CID | High |

## Decision

Adopt **content-defined chunking with signed Merkle manifests (Option 2),
delivered through the storage-descriptor seam (Option 5)** as Epoch's large-file
direction, and layer **chunk-range transport (Option 6)** and **entity-aware
chunking/streaming policy (Option 9)** on top of it.

Rationale, against the two weighted axes:

- **Storage and transfer efficiency.** Content-defined chunking is the only option
  that delivers global, cross-file, cross-version dedup *and* incremental hashing,
  I/O, and transfer. A one-byte edit touches a few chunks, not a whole file. Paired
  with Option 6 it retires the base64 in-memory transport wall and gives partial,
  resumable sync. Deployed as loose-vs-pack tiering (Option 4), small blobs keep
  today's cheap path.
- **Preservation of the trust model.** Chunking stays *totally* verifiable: chunks
  are content-addressed, the manifest is itself a content-addressed blob, and
  `verify` extends from "re-hash the blob" to "verify the manifest hash, each chunk
  hash, and the reassembled full-content hash and length." Because Option 5 keeps
  `blob_sha256` bound to the full content, `record`/`intent`/`version` payload shapes
  do not change, old inline events keep working, and a missing chunk is handled by
  generalizing the existing `redaction` path (a sanctioned absence, with signed
  evidence) from whole blobs to chunk ranges.

Option 9 rides the `EntityAdapter` seam Epoch already owns, turning "stream video,
mount datasets, keep text mergeable" into a per-`entity_type` policy rather than a
special case, and gives the entity-aware, streaming behavior that motivated this
work.

The following are **explicitly documented but not adopted as the default**:

- **Option 11 (external artifact repository)** is retained as an *opt-in*
  `external-pointer` storage descriptor for teams that want bytes on their own
  infrastructure, but not as the default, because it moves availability, garbage
  collection, and redaction outside the signed store and breaks the self-contained,
  local-first clone — the trust axis this decision protects.
- **Option 3 (delta chains)** loses to Option 2 on random/streaming access and on
  global (vs. pairwise) dedup.
- **Options 7 and 8 (p2p swarm, p2p CDN)** are a natural *later* layer once chunks
  exist, gated — per ADR-0003 — on redaction and availability being solved first;
  they are not part of this decision.
- **Option 12 (IPFS/CID)** remains an anti-pattern already on record.

## Consequences

Positive:

- Large assets stop re-uploading and re-hashing whole; dedup becomes global across
  files and versions; the base64 transport wall is removed once Option 6 lands.
- The trust model is unchanged from the outside: one hash still names one file's
  content, `verify` stays total, and redaction still governs sanctioned absence.
- Event, intent, and version schemas do not change shape; the change is an additive,
  optional storage descriptor, so history stays byte-for-byte comparable and old
  repositories keep working.
- Streaming and mount become expressible as per-`entity_type` policy over the same
  chunk substrate, and the p2p/CDN options (7/8) inherit a ready-made, verifiable
  transfer unit if pursued later.

Trade-offs:

- New machinery to build and maintain: a pinned/versioned chunker, chunk packing,
  an assembly index, chunk-level garbage collection, and chunk-range redaction
  evidence.
- A second storage path (loose vs. packed) and a promotion policy to tune.
- `verify` does more work per large blob (manifest + N chunk hashes), mitigated by
  the incremental nature of chunk verification and by caching.
- Entity-aware video segmentation requires container-format awareness; unknown types
  fall back to generic content-defined chunking.

## Revisit Criteria

Revisit this decision if:

- measured dedup on real asset workloads does not beat whole-file storage enough to
  justify the chunking machinery (fall back to Option 4 tiering, or Option 1 for
  small repositories);
- chunk-level garbage collection or redaction evidence proves materially harder than
  the whole-blob equivalents;
- a hosting story makes the p2p/CDN tiers (Options 7–8) or a mount handle
  (Option 10) worth their operational surface; or
- demand for bytes-on-external-infrastructure makes the `external-pointer`
  descriptor (Option 11) common enough to warrant first-class availability and
  redaction handling despite its weaker local-first guarantees.

## Related Documents

- [Current Design](../design.md) — object store, redaction semantics, and non-goals.
- [ADR-0001: Design Philosophy And Inspiration](0001-design-philosophy-and-inspiration.md)
  — storage adapters as first-class extension points; IPFS anti-lessons.
- [ADR-0003: Competitive Gap Design Options](0003-competitive-gap-design-options.md)
  — pluggable transport tiers and blob-availability guardrails.
- [ADR-0014: Virtual Working Tree And Sparse Checkout](0014-virtual-working-tree-and-sparse-checkout.md)
  — regenerable cache, on-demand hydrate, and the delta-storage revisit criteria.
- Competitor dossiers:
  [Hugging Face Xet](../competition/products/hugging-face-xet/design/design.md),
  [DVC](../competition/products/dvc/design/design.md),
  [lakeFS](../competition/products/lakefs/design/design.md),
  [Perforce](../competition/products/perforce-p4/design/design.md),
  [Unity Version Control](../competition/products/unity-version-control/design/design.md),
  [Fossil](../competition/products/fossil-scm/design/design.md).
- [CLI Reference](../cli.md) · [SDK Reference](../sdk.md) · [Feature Registry](../features.md)
