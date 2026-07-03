---
product: Diversion
design_sources:
  - https://www.diversion.dev/
  - https://www.diversion.dev/product
  - https://news.ycombinator.com/item?id=39088551
---

# Design

## Look And Feel

Diversion presents as a polished, modern developer/creator product with a cloud-native identity, a marketing site, and a workflow aimed at studios. It offers Git-like branching concepts wrapped in an experience meant to feel simpler than Git for teams whose members are not Git experts. (Impression from public marketing pages; the actual client UI is not documented in the retrieved sources.)

## Open Design Assets

- The Diversion website and product pages describe the value proposition, performance claims, and studio positioning.
- There are no public protocol specs, design systems, or open-source client repositories in the retrieved sources; internals are not documented.
- Community discussion (Hacker News) provides third-party reactions but not authoritative design detail.

## Differentiators

- Native large-file handling framed so that file size is a non-issue, removing the LFS setup step entirely. (Vendor claim.)
- Cloud-native, serverless architecture where repository operations are REST calls, positioned as effortless scale and zero-infrastructure for the user. (Vendor claim.)
- Studio-focused workflow (Unreal/Unity) rather than a general developer tool, letting the design speak directly to artists and technical directors.

## What Works

- Removing LFS ceremony is a genuine UX win the market wants; treating a 500 MB asset like any other file matches how artists think. This is the same friction Epoch targets with native, chunk-addressed large files (ADR-0015).
- "Fetch what the working set needs" gives fast onboarding on huge repositories, aligning with Epoch's targeted-checkout direction (ADR-0016).
- A cloud-native model hides operational complexity from non-expert users, which is attractive for creative teams. Epoch can capture similar simplicity while remaining local-first and verifiable.

## UX Breakdowns

- Opaque internals mean users must trust the cloud service; there is no public, verifiable account of how content is chunked, addressed, or signed. Epoch's transparent, signed content-addressed model is the counter-position.
- Cloud/server-authoritative operation implies dependence on connectivity and the vendor's availability for core actions, unlike a local-first system. (Inferred from the serverless, REST-per-operation description.)
- Performance figures are vendor-supplied and unverified, so the real large-file and large-repo experience under adverse conditions is unknown.
- Without documented provenance or signing, multi-author trust and auditability are unclear, which is exactly the governance gap Epoch's signed events are designed to fill.
