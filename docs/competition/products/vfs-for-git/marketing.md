---
product: VFS for Git / Scalar
marketing_sources:
  - https://github.com/microsoft/VFSForGit
  - https://github.com/microsoft/VFSForGit/blob/master/Protocol.md
  - https://github.blog/open-source/git/the-story-of-scalar/
  - https://devblogs.microsoft.com/devops/introducing-scalar/
---

# Marketing

## Target Customers

- Organizations with very large monorepos (millions of files, hundreds of gigabytes) where stock Git operations become slow or unusable.
- Enterprise engineering teams, exemplified by Microsoft's own Windows-scale repository, needing Git to remain fast at extreme scale.
- Teams that want scale without abandoning Git semantics, tooling, and hosting.
- Developers who only ever work in a small slice of a huge codebase.

## Positioning

VFS for Git was positioned as "Git at enterprise scale" — making an entire massive repository usable by virtualizing the filesystem. Scalar is positioned as the pragmatic successor: the same scale benefits using portable, upstreamable Git features rather than a custom filesystem driver, culminating in Scalar being folded into Git itself.

## Customer Model

- Both are open-source Microsoft projects rather than paid products; the value accrues to Azure DevOps / GitHub hosting and to internal Microsoft engineering.
- The GVFS protocol is the integration point a host must implement to offer reduced-object clones with on-demand backfill and cache servers.
- Scalar's upstreaming into Git means capture shifts to any host and client supporting partial clone and sparse-checkout, broadening reach while ending the standalone product story.
- Adoption is top-down within large orgs solving a concrete scale crisis, then diffused through upstream Git.

## Captures

- Enterprises running monorepos too large for vanilla Git.
- Teams on hosts that implement the GVFS protocol and cache servers.
- Developers who work in a narrow cone of a giant tree and benefit from sparse-checkout.
- The broader Git community, now that Scalar's mechanisms are upstream.

## Misses

- Small and mid-size repositories that never hit Git's scale limits and gain nothing from the added machinery.
- Non-code, large-binary-heavy workflows (media, game assets) where the pain is per-file size and churn rather than file count.
- Teams needing signed provenance, policy, or governance over content, which these scale tools do not provide.
- Users wanting a turnkey product experience rather than infrastructure and protocol plumbing.
