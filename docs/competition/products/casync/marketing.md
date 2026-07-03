---
product: casync / desync
marketing_sources:
  - https://github.com/systemd/casync
  - https://0pointer.net/blog/casync-a-tool-for-distributing-file-system-images.html
  - https://github.com/folbricht/desync
---

# Marketing

casync and desync are open-source tools, so their "marketing" is an adoption and positioning narrative carried by the systemd-org README, Lennart Poettering's blog, and the desync project.

## Target Customers

- OS, VM, container, and IoT image distributors who ship large images that change incrementally between versions.
- Backup and archival systems that benefit from cross-file, cross-snapshot deduplication.
- Infrastructure teams wanting to serve deduplicated content from commodity HTTP/CDN/S3/SSH endpoints with no special server.
- Embedded and edge deployments needing efficient A-to-B image updates using existing on-disk data as a seed.

## Positioning

casync is positioned as a tool for efficiently distributing and versioning filesystem images: "combine the best of rsync and Git" for whole-image delivery, using content-defined chunking so only changed chunks move. desync extends the positioning to cloud-native stores (S3/SFTP), concurrency, caching, and FUSE mounting, making the same model practical in modern infrastructure.

## Customer Model

- Adoption is open-source and infrastructure-led; the value is the format and CLI, not a hosted service.
- The plain-file chunk store means distribution rides on infrastructure teams already have (CDNs, object storage, SSH).
- Seeding from local data lowers bandwidth cost, which is the core adoption incentive for large-image use cases.
- desync broadens reach by adding cloud backends and a FUSE mount for lazy access.

## Captures

- Image and backup workflows with heavy incremental overlap between versions.
- Teams that want deduplicated delivery without running a bespoke server.
- Edge/IoT updates that reuse on-disk data as a seed to minimize transfer.
- Users who want to mount and browse an image lazily rather than fully extract it.

## Misses

- Version control: no branching, history, or authorship, so it is not a VCS.
- Authenticity: indices are not signed, so trust rests on the delivery channel.
- Collaboration and review semantics over evolving multi-author content.
- Explicit availability guarantees: completeness depends on whatever store hosts the chunks.
