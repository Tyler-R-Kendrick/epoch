# Blob And Large-File Gap Analysis

This document is the competitive **gap analysis** behind Epoch's large-file direction. It
measures Epoch's current whole-file blob store, and the direction chosen in
[ADR-0015](design-decisions/0015-large-file-and-blob-handling-options.md) and
[ADR-0016](design-decisions/0016-entity-aware-streaming-and-targeted-checkout.md), against the
best-in-class behavior captured in the [competitor dossiers](competition/README.md). It exists to
make the *residual* gaps explicit — the capabilities that are neither implemented today nor fully
specified by the accepted decisions — so the reference architecture in
[ADR-0018](design-decisions/0018-blob-subsystem-reference-architecture.md) has a concrete target.

It follows the house rule that these are research and design artifacts: they describe a **shape and
its gaps**, not a build sequence. Nothing here is implemented until it lands with code and feature
coverage.

## What Epoch stores today

Every recorded file is one **whole** blob, named by the SHA-256 of its full bytes, in a flat
content-addressed store at `.epoch/blobs/`. The reference triple `{ blob_sha256, size, entity_type }`
travels on every content-bearing event, and `verify` re-reads each blob and recomputes its hash.
`redaction` is the one sanctioned way a blob may be legitimately absent. See
[Current Design](design.md). This is totally verifiable and trivially simple, but a poor fit for
large binary assets, along four axes ADR-0015 names: **no sub-file dedup**, **whole-file memory
pressure**, **a base64 in-memory transport wall**, and **no streaming or partial access**.

## The yardstick: Epoch's blob requirements

Requirements are ranked by the two weighted axes ADR-0015 adopts — **storage/transfer efficiency**
and **preservation of the trust model** — plus Epoch's design principles (offline-first and
self-contained; additive/back-compatible; extensible through existing seams). The posture
throughout is *"transport moves bytes, verification decides whether bytes are acceptable."*

## Capability-coverage matrix

| Capability | Best-in-class exemplar(s) | Epoch today | Decided (ADR-0015/0016) | Residual gap |
|---|---|---|---|---|
| Sub-file / content-defined dedup | [Xet](competition/products/hugging-face-xet/design/design.md), [restic](competition/products/restic/design/design.md), [casync](competition/products/casync/design/design.md), [Borg](competition/products/borgbackup/design/design.md) | None — one-byte edit mints a whole new blob | FastCDC/Gearhash chunks, global cross-file/version dedup | Chunker choice + **pinned, versioned parameters** as a format contract |
| Incremental hashing & I/O | restic, Borg, [Perkeep](competition/products/perkeep/design/design.md) | Whole file read + hashed in memory | Chunk-at-a-time hashing/I/O | Streaming record path; bounded-memory re-chunk of edited regions |
| Streaming & partial / ranged access | [Xbox](competition/products/xbox-series-x/design/design.md), [BitTorrent v2](competition/products/bittorrent/design/design.md), [Hypercore](competition/products/hypercore-dat/design/design.md) | None — any read hydrates the whole blob | Chunk-granular partial residency; GOP-aligned video | Portable lazy-hydration handle (mount/VFS) — the VFS-for-Git→Scalar caution |
| Chunk-range / partial transport | casync, [S3 range GET](competition/products/s3-minio/design/design.md), [OCI zstd:chunked](competition/products/oci-oras/design/design.md) | `exportToMemoryTransport` base64s **every** blob | have/want negotiation over the transport seam | The actual negotiation protocol (have/want sets, chunk availability accounting) |
| Entity/type-aware storage & streaming | Xbox Sampler Feedback, [Perforce](competition/products/perforce-p4/design/design.md) typemap | `entity_type` only selects merge/diff/display | Per-type storage-and-streaming strategy on the adapter seam | The video segmenter (container-format awareness); a per-type chunker registry |
| Total verifiability (signed, content-addressed) | [Tahoe-LAFS](competition/products/tahoe-lafs/design/design.md) Merkle segments, BitTorrent v2 | Total: re-hash the whole blob | Manifest hash → each chunk hash → reassembled full-content hash | **Manifest schema canonicalized into the signed event** (tamper-evident, not advisory) |
| Self-contained, local-first clone | [Fossil](competition/products/fossil-scm/design/design.md), Xet (in-repo) | Total: clone carries all bytes | Preserved for `inline`/`chunk-manifest`; opt-out only via `external-pointer` | Keeping the default self-contained while offering opt-in external bytes |
| Sanctioned absence / redaction | (Epoch-specific; no true peer analog) | Signed `redaction` for a whole blob | Generalize `redaction` to **chunk ranges** | Chunk-range redaction **evidence format**; verify semantics for partial absence |
| Availability & durability | Tahoe erasure coding, [Diversion](competition/products/diversion/design/design.md) cloud, [IPFS](competition/products/ipfs/design/design.md) (cautionary) | Availability implicit in local copy + manual sync | Explicit tiers (pin/seed/backup-origin) named, deferred | Pinning/seed policy; erasure-coding/replication story; availability accounting |
| Small-file efficiency (loose vs pack) | restic/Borg packs, Fossil, OSTree loose objects | One loose file per blob (fine for small) | Loose-vs-pack tiering as the deployment shape | Pack format + promotion policy (when a blob earns a pack) |
| Dedup under compression / encryption | [Borg](competition/products/borgbackup/design/design.md), restic | N/A (no chunking, no encryption) | Noted as a caveat | **Chunk-before-compress/encrypt ordering** must be pinned into the format |
| Garbage collection of chunks | restic prune, [OSTree](competition/products/ostree/design/design.md) refs-as-roots, Perkeep | Whole-blob reachability from events | Implied by packs/manifests | **Chunk/pack-level GC + GC roots**; interaction with redaction and compacts |
| Concurrent binary-edit safety | [Git LFS](competition/products/git-lfs/design/design.md) / Perforce locks, Borg append-only lock | None (no locking concept) | Opt-in **signed exclusive locks** as lifecycle events | Lock semantics without a coordinating peer; lease/expiry; reflink fast-path |
| Backward-compat / additive evolution | (design constraint) | Reference triple is fixed and universal | Additive optional `storage` descriptor; `inline` default | Reader **fail-closed** rule for unknown `storage`; migration/promotion path |

## Residual gaps (the work this analysis surfaces)

Each gap is neither in the code today nor fully pinned by ADR-0015/0016. Each names the competitor
lesson that informs it and the ADR-0018 layer that resolves it.

1. **Chunker pinning and format stability.** CDC only dedups reproducibly if the chunker and its
   parameters are fixed; they become part of the on-disk/wire format. restic pins a per-repo
   polynomial; casync/Borg expose explicit `chunker-params`. Epoch must record a **versioned chunker
   descriptor** in the manifest. → ADR-0018 L1 (chunker + manifest).
2. **Manifest schema in the signed event.** A manifest must be a content-addressed blob whose hash
   is bound by the signed event, so it is tamper-evident rather than advisory — the property casync's
   unsigned index lacks and Perkeep's file-schema blob has. → ADR-0018 L1/L5.
3. **Chunk/pack garbage collection.** Moving from whole-blob to chunk/pack storage needs
   reachability GC with explicit roots (restic prune; OSTree refs-as-roots) and must compose with
   redaction and compacts. → ADR-0018 L2.
4. **Have/want transport negotiation.** Retiring the base64 wall requires a real negotiation
   protocol (heads → missing manifests → missing chunks), each chunk hash-checked on arrival, so an
   untrusted relay can carry bytes. casync/S3 range GET/OCI zstd:chunked show the transfer unit;
   the protocol is unspecified. → ADR-0018 L3.
5. **Availability and pinning.** Content addressing is not availability — the IPFS lesson. Tahoe-LAFS
   (erasure-coded k-of-n + repair) and Diversion (cloud origin) show explicit durability. Epoch needs
   a pinning/seed/backup-origin policy and availability accounting. → ADR-0018 L7.
6. **External artifact-store semantics.** The opt-in `external-pointer` (OCI/ORAS, S3/MinIO) moves
   availability, GC, and redaction outside the signed store, and those stores sign separately
   (cosign) or not at all. The trust trade-off and fail-closed handling must be specified. →
   ADR-0018 L7.
7. **Dedup under compression/encryption ordering.** Boundary-shifting dedup dies if bytes change
   globally first. Borg and restic solve it by **chunking plaintext, then compressing/encrypting per
   chunk**. This ordering must be pinned even before Epoch adds encryption. → ADR-0018 L3 note.
8. **Loose-vs-pack promotion policy.** Small text should stay a trivially verifiable loose blob;
   only large/cold blobs earn chunking and packs (Fossil, restic). The promotion threshold and the
   two-path verify are unspecified. → ADR-0018 L2.
9. **Portable lazy hydration (mount).** A terabyte view materialized as gigabytes needs an on-access
   hydration handle. VFS-for-Git's retreat to Scalar (partial clone + sparse checkout) warns against
   a bespoke per-platform filesystem; casync's FUSE mount shows the shape. Portability is the open
   question. → ADR-0018 L5.
10. **Chunk-range redaction evidence.** Generalizing `redaction` from whole blobs to ranges needs a
    signed evidence format and verify rules for partial, sanctioned absence. → ADR-0018 L6/L7.
11. **Dedup measurement / telemetry.** ADR-0015's revisit criteria hinge on *measured* dedup beating
    whole-file storage. There is no way yet to measure dedup ratio, chunk reuse, or transfer savings
    on real asset workloads. → ADR-0018 revisit criteria.

## How the advised architecture closes them

[ADR-0018](design-decisions/0018-blob-subsystem-reference-architecture.md) consolidates ADR-0015 and
ADR-0016 into one layered reference architecture and maps each layer onto an existing Epoch code
seam (the reference triple in `packages/Epoch.Core/src/domain.ts`, `recordPatch`/`verify`/transport
in `core.ts`, the `EntityRegistry` in `crdt.ts`, the virtual working tree, and the `redaction`
path). Every residual gap above is assigned to a layer there, and each layer lands independently
with its own code and feature coverage.

## Related documents

- [ADR-0015: Large-File And Blob-Handling Options](design-decisions/0015-large-file-and-blob-handling-options.md)
- [ADR-0016: Entity-Aware Streaming And Targeted Checkout](design-decisions/0016-entity-aware-streaming-and-targeted-checkout.md)
- [ADR-0018: Blob Subsystem Reference Architecture](design-decisions/0018-blob-subsystem-reference-architecture.md)
- [ADR-0003: Competitive Gap Design Options](design-decisions/0003-competitive-gap-design-options.md)
- [Current Design](design.md) · [Competition Research](competition/README.md)
