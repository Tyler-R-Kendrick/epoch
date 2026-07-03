---
product: Tahoe-LAFS
design_sources:
  - https://www.tahoe-lafs.org/
  - https://tahoe-lafs.readthedocs.io/en/latest/architecture.html
  - https://tahoe-lafs.readthedocs.io/en/latest/about.html
  - https://github.com/tahoe-lafs/tahoe-lafs
---

# Design

## Look And Feel

Tahoe-LAFS is a storage grid plus a command-line and gateway surface, not a GUI product; its "design" is the on-disk and on-the-wire model — the grid of independent storage servers, the client-side encrypt-then-erasure-code pipeline, the capability strings that name files, and the Merkle-tree integrity that binds shares to a cap. A file is reached through a web-gateway or CLI client that resolves a cap, fetches k of N shares, verifies them against the embedded root hash, and reassembles the plaintext locally.

## Open Design Assets

- The tahoe-lafs.org site and the readthedocs architecture and about pages document the grid model, the encode/upload pipeline, the capability system, and provider-independent security.
- The GitHub repository is fully open source, so the erasure-coding, Merkle-tree, and capability-derivation formats are specified in code alongside the developer references.
- The published architecture material describes the segment/share layout and the read-cap/verify-cap/write-cap relationships in enough detail to treat them as prior art.

## Differentiators

- Client-side encryption plus erasure coding (a Reed-Solomon-style scheme; secondary detail) so servers hold only ciphertext shares and any k of N reconstruct the file.
- A capability model in place of ACLs: authority travels in the cap itself, and diminishing derivation (write → read → verify) makes delegated, least-authority access the default.
- The verify-cap: a third authority tier that proves integrity and drives repair with no ability to decrypt — integrity and availability decoupled from confidentiality.
- Merkle hash trees over file segments with the root embedded in the cap, so integrity is checked per segment/share and tampering is caught before reassembly.

## What Works

- Erasure coding gives quantifiable durability (tolerate N−k losses) and self-repair from surviving shares, exactly the explicit-availability model Epoch wants over IPFS-style "hope a pin exists" (ADR-0015 Options 7/8, ADR-0003 transport tiers).
- Segment-level Merkle verification is the same shape as Epoch's per-chunk hashes under a signed manifest root (ADR-0015 Option 2), so Tahoe validates chunk-granular, incremental verification over whole-file re-hashing.
- The verify-cap is a clean template for "replicate or integrity-check a blob/chunk range without reading it," directly useful to ADR-0016's chunk-range redaction and availability without exposing plaintext.
- Provider-independent security shows a storage layer can be untrusted for both confidentiality and integrity, reinforcing Epoch's posture that transport moves bytes while verification decides whether bytes are acceptable.

## UX Breakdowns

- Tahoe has no version history, branching, or authorship model; it stores and secures files. Epoch must still supply the signed-event history and multi-author semantics Tahoe does not attempt, so users cannot mistake secure storage for version control.
- Authenticity rests on capability possession, not on a signature over who authored a change; Epoch's Ed25519-signed events answer a question ("who recorded this") that caps do not.
- Running and sizing a grid of storage servers, and tuning k/N, is real operational weight; Epoch should borrow the durability math without importing a bespoke server fleet as a hard requirement.
- The encryption-plus-erasure-coding pipeline adds compute cost and N/k storage expansion, a trade-off Epoch must weigh against its whole-object simplicity when it reaches for erasure coding at the availability tier.
