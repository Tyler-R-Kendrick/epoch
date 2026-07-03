---
product: Xbox Series X|S
design_sources:
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/overviews/streaming_install-intelligent_delivery
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/intelligentdelivery-device
  - https://news.xbox.com/en-us/2020/06/15/what-is-smart-delivery-xbox-series-x/
  - https://support.xbox.com/en-US/help/games-apps/game-setup-and-play/get-back-to-your-game-instantly-with-quick-resume
  - https://xboxoneresearch.github.io/wiki/operating-system/xbox-virtual-drive/
---

# Design

## Look And Feel

Players see streaming installs as a "ready to play" state that appears well before the full download finishes, plus Quick Resume tiles that restore a suspended game in seconds. Developers experience the design through the GDK package-layout XML, makepkg.exe, and xbapp tooling, and through Intelligent Delivery specifiers. Smart Delivery appears in the storefront as a single purchase that fetches the right build for the player's console.

## Open Design Assets

- Microsoft documents the streaming-install and Intelligent Delivery model, device specifiers, and packaging workflow on Microsoft Learn (GDK docs).
- Consumer-facing explanations of Smart Delivery and Quick Resume are published on Xbox news and support pages.
- The XVD/XVC container internals (secured virtual disk, AES-XTS regions, SHA-256 hash tree, XVC descriptor) are documented by the XboxOneResearch wiki and tools such as xvdtool and XvdTool.Streaming (secondary, reverse-engineered).

## Differentiators

- A signed SHA-256 hash tree over data blocks lets any single block be verified while streaming, so integrity does not require downloading or hashing the whole package.
- Region-addressed AES-XTS (region ID folded into the data-unit number) makes each region independently keyed and addressable, enabling decrypt-on-demand of only touched regions.
- Sampler Feedback Streaming pushes partial residency down to the texture-tile level: the GPU samples which mip tiles are needed and only those stream into memory.
- Quick Resume snapshots a game's full suspended runtime state to SSD, holds multiple titles, restores in seconds, and survives reboots and updates, built on the Xbox Velocity Architecture (custom NVMe SSD, hardware decompression, SFS).

## What Works

- The signed-root hash tree over content blocks is the design Epoch is converging on: a signed manifest over content-addressed chunks with incremental per-block verification while streaming.
- Declaring a launch chunk as the guaranteed minimum working set is a clean model for Epoch's targeted/sparse checkout of just the chunks a view needs.
- Region-addressed decrypt-on-access shows partial residency and integrity can coexist, informing Epoch's chunk-range checkout.
- MSIXVC2 decoupling layout from delta size validates the content-defined-chunking premise that identity, not file layout, should drive transfer.

## UX Breakdowns

- The package format's security and streaming internals are opaque and largely reverse-engineered, so developers debugging install or streaming issues lean on community tooling (secondary), a legibility gap Epoch's documented signed events can avoid.
- Two package generations (MSIXVC and MSIXVC2) mean layout changes that are free on one can inflate patches on the other, adding cognitive load.
- Quick Resume occasionally breaks for titles with online sessions or licensing checks, surfacing state-restore edge cases that pure content addressing does not solve.
- Integrity is by Microsoft-signed root, not per-actor signed provenance, so the model verifies authenticity of a Microsoft build but not multi-actor collaboration history, which is where Epoch's signed-event model differentiates.
