---
product: VFS for Git / Scalar
design_sources:
  - https://github.com/microsoft/VFSForGit
  - https://github.com/microsoft/VFSForGit/blob/master/Protocol.md
  - https://github.blog/open-source/git/the-story-of-scalar/
  - https://devblogs.microsoft.com/devops/introducing-scalar/
---

# Design

## Look And Feel

Both tools are developer infrastructure, not graphical products. VFS for Git presents itself as an ambient capability: the repository simply appears fully present in the filesystem, and files fill in transparently on first access via a provider process. Scalar is a thin command-line wrapper (`scalar clone`, `scalar register`) around stock Git, so the felt experience is "Git, but it stays fast on a giant repo."

## Open Design Assets

- The VFS for Git repository and its `Protocol.md` document the GVFS REST protocol (objects, batch objects, prefetch, sizes, config endpoints) as the primary integration contract.
- The GitHub "story of Scalar" post and the "Introducing Scalar" devblog describe the architectural shift from a virtual filesystem to composed Git primitives.
- There is no public visual design system; the assets are protocol docs, engineering blog posts, and the open-source client code.

## Differentiators

- Hydrate-on-open: files appear present but content is fetched only on first access, making working-tree size effectively decoupled from repository size.
- Non-blob prefetch: history objects can be fetched in packs independent of blob content, so clients get commit/tree structure cheaply.
- The strategic pivot itself is a differentiator: Scalar demonstrates that portable, upstreamable Git features can replace a custom filesystem layer.

## What Works

- The virtual filesystem made truly enormous monorepos usable when nothing else could, proving the demand for on-demand materialization.
- Scalar's composition of partial clone, cone sparse-checkout, commit-graph, FSMonitor, and background maintenance delivers most of the scale win without a kernel-level driver — a portability model Epoch should emulate for targeted checkout (ADR-0016) over its content-addressed working tree.
- Cache servers near clients keep on-demand hydration fast, a pattern Epoch can reuse for content-addressed chunk delivery.
- Upstreaming Scalar into Git validated the approach and reduced long-term maintenance, reinforcing "portable over bespoke" for Epoch's own materialization design.

## UX Breakdowns

- The virtual filesystem approach was platform-specific and maintenance-heavy (ProjFS on Windows), which is precisely why the project pivoted; a bespoke FS driver is a UX and ops liability. Epoch should avoid taking on an equivalent kernel dependency.
- On-demand hydration can surprise users when an offline or slow-network moment turns a routine file open into a stall, because the cost is hidden behind normal filesystem access.
- Sparse-checkout cone rules are powerful but can confuse users about why some paths appear empty or missing; Epoch's signed-event model can make the materialized set explicit and auditable rather than implicit config.
- The split between VFS for Git and Scalar, plus GVFS-protocol availability depending on the host, makes it hard for users to know which mechanism is actually in effect.
