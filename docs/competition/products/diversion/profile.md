---
product: Diversion
slug: diversion
category: cloud_native_large_file_vcs
primary_sources:
  - https://www.diversion.dev/
  - https://www.diversion.dev/product
  - https://news.ycombinator.com/item?id=39088551
---

# Diversion

Diversion is a cloud-native version control system that positions large files as first-class citizens, targeting game and creative studios that find Git and Git LFS painful. It competes with Epoch on the "native large files without LFS ceremony" promise, and validates market demand for a large-file VCS that does not bolt storage onto Git. Its internals are not publicly documented, so the technical claims below are vendor or marketing statements and are flagged as such.

Diversion is described as serverless and cloud-native: every repository operation (commit, branch, merge) is a REST API call against distributed storage and databases, rather than operations on a local object database. (Vendor description; internals unconfirmed.) It offers Git-like branching and is aimed at Unreal and Unity studios where large binary assets dominate.

## Competitive Relevance

- "Large files are native" — Diversion claims a 500 MB level file is handled like a 5 KB config, with no LFS setup and no file-size limits. (Vendor/marketing claim.)
- It claims TB-scale repositories and millions of files. (Vendor/marketing claim.)
- Marketing performance figures include roughly 400K files committed in about 30 seconds and cloning 5 million files in under 5 minutes. (Vendor/marketing claims; not independently verified.)
- Sync is cloud-mediated: the client fetches what the working set needs rather than the whole repository. (Vendor description.)
- Given the stated performance profile it likely uses server-side content-defined chunking and content-addressed blobs, but this is UNCONFIRMED and inferred, not documented.

## Epoch Implications

- Diversion validates real demand for a native large-file VCS without Git LFS ceremony, reinforcing Epoch's large-file thesis.
- "Fetch what the working set needs" is the same instinct as Epoch's targeted partial checkout (ADR-0016) — Epoch should match this ergonomic while keeping it local-first.
- The key contrast is architectural: Diversion is cloud/server-authoritative with opaque internals, whereas Epoch is local-first, signed, verifiable, and open about its content-addressed event model. That transparency and offline capability is a differentiation axis.
- Diversion's unknown chunking and content-addressed-storage internals are a research gap to track; if it is doing server-side CDC, it is a direct efficiency competitor to Epoch's ADR-0015 chunking, and Epoch should watch for any disclosed details.
- A cloud-authoritative model concentrates trust in the vendor; Epoch's signed multi-author events offer verifiable provenance that a REST-call-per-operation model does not inherently provide.
