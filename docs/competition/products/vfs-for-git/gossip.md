---
product: VFS for Git / Scalar
gossip_sources:
  - https://github.com/microsoft/VFSForGit
  - https://github.com/microsoft/VFSForGit/blob/master/Protocol.md
  - https://github.blog/open-source/git/the-story-of-scalar/
  - https://devblogs.microsoft.com/devops/introducing-scalar/
---

# Gossip

## What People Say

- VFS for Git is remembered as an impressive feat that made the Windows monorepo workable, but also as heavy, Windows-centric infrastructure. (Widely reported engineering sentiment.)
- The pivot to Scalar is generally read as an admission that a bespoke virtual filesystem was too costly to maintain, and that composing portable Git features was the wiser path.
- Scalar's upstreaming into Git is viewed positively, since the scale benefits now reach everyone without a separate tool.
- Practitioners praise partial clone and cone sparse-checkout as the durable, portable ideas that came out of the effort.

## Bug And Friction Themes

- Platform-specific fragility of the virtual filesystem driver (ProjFS), and the maintenance burden it imposed. (Reported as the core motivation for the pivot.)
- On-demand hydration stalls when the network or cache server is slow, since a normal file open can block on a download.
- Confusion about which mechanism is active (VFS vs Scalar vs GVFS-protocol availability on a given host) and why some paths appear absent under sparse-checkout.
- Dependence on host support for the GVFS protocol and cache servers to get the full reduced-object experience.

## Product Risk For Epoch

- The strongest lesson is a warning: a bespoke filesystem driver is a maintenance and portability trap. Epoch should pursue targeted checkout and lazy hydration (ADR-0016) through portable mechanisms over its content-addressed working tree, not a kernel-level FS layer.
- Hidden-cost hydration stalls are a UX risk Epoch inherits if it materializes chunks lazily; Epoch should surface fetch state explicitly, ideally tied to its signed-event model so the materialized set is auditable.
- These tools solve file-count scale but not provenance or policy, leaving room for Epoch to pair scale with signed, verifiable history — but Epoch must match their proven "only what I touch" ergonomics to be credible.
