---
product: Diversion
gossip_sources:
  - https://www.diversion.dev/
  - https://www.diversion.dev/product
  - https://news.ycombinator.com/item?id=39088551
---

# Gossip

## What People Say

- Community reactions (Hacker News) show interest in a large-file-native, Git-like alternative to Perforce for game studios, mixed with the usual skepticism about a new proprietary cloud VCS. (Secondary discussion; not authoritative.)
- The "large files are native, no LFS setup" message resonates with people burned by Git LFS.
- Some commenters question how it compares to Perforce, which remains the studio incumbent, and whether a cloud-only model fits studio realities. (Secondary sentiment.)
- Performance claims draw attention but also requests for independent verification, since the figures are vendor-supplied.

## Bug And Friction Themes

- Dependence on connectivity and the vendor's cloud for core operations, given the serverless, REST-per-operation design. (Inferred concern; not a documented bug.)
- Opaque internals mean users cannot audit how large files are chunked, deduplicated, or stored.
- Uncertainty about migration from and interoperability with existing Perforce or Git workflows. (Secondary discussion.)
- Trust and lock-in questions typical of a young, proprietary, cloud-only VCS.

## Product Risk For Epoch

- Diversion competes for the same "native large files without LFS" narrative Epoch wants; if its cloud experience is smooth for studios, it sets a high ergonomic bar Epoch must meet with targeted checkout (ADR-0016).
- Its main structural weakness — cloud-authoritative, opaque, unverifiable internals — is exactly where Epoch differentiates with a local-first, signed, content-addressed event model; Epoch should make that contrast explicit in positioning.
- The biggest research gap is Diversion's undocumented chunking and content-addressed storage; if it is doing effective server-side CDC, it is a direct efficiency competitor to Epoch's ADR-0015 work, and Epoch should monitor any technical disclosures.
