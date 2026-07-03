---
product: Xbox Series X|S
slug: xbox-series-x
category: game_asset_streaming_delivery
primary_sources:
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/overviews/streaming_install-intelligent_delivery
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/intelligentdelivery-device
  - https://news.xbox.com/en-us/2020/06/15/what-is-smart-delivery-xbox-series-x/
  - https://support.xbox.com/en-US/help/games-apps/game-setup-and-play/get-back-to-your-game-instantly-with-quick-resume
  - https://xboxoneresearch.github.io/wiki/operating-system/xbox-virtual-drive/
---

# Xbox Series X|S

Xbox Series X|S delivers large game installs through streaming installation, Intelligent Delivery, and a secured virtual-disk package format verified by a signed SHA-256 hash tree. Its combination of a signed Merkle-style hash tree over data blocks, region-addressed decrypt-on-access, and GPU-driven sub-asset texture streaming makes it the closest console analog to Epoch's signed-manifest-over-content-addressed-chunks direction.

## Competitive Relevance

- Streaming Installation ("Play As You Download") lets a title declare a launch chunk (the minimum subset needed to start); the system guarantees that subset is on disk before the app is launchable, then copies the rest in the background while the player plays.
- Developers define chunks in a package-layout XML (`<Chunk Id Marker="Launch">`, `<FileGroup>` entries), package with makepkg.exe, and test with xbapp install; titles can reorder chunk install priority at runtime based on player input.
- Intelligent Delivery segments content into logical chunks tagged with specifiers (rules for when and where a chunk installs), e.g. `Languages="fr"` or `Devices="Xbox-Scorpio"`. Smart Delivery (one purchase yields the correct optimized build per console generation) is the consumer feature built on these device specifiers.
- The system supports MSIXVC and MSIXVC2; with MSIXVC2, reordering chunks or moving files between chunks does not inflate update sizes, decoupling package layout from patch delta.
- Package format (XVD/XVC) details are reverse-engineered (secondary; Microsoft documents only behavior): XVD is a secured Xbox Virtual Disk container and XVC is the game-data variant from makepkg; both mount as virtual drives, with an NTFS payload encrypted under a Content Instance Key.
- Data blocks use AES-XTS; for XVC the region ID is folded into the AES-XTS data-unit number, so each region is independently keyed and addressable, enabling decrypt-on-demand of just the touched regions (reverse-engineered, secondary).
- Integrity comes from a cascading SHA-256 hash tree (Merkle-style): every data block is hashed up to a single root hash in the header that is signed by Microsoft, so any individual block can be verified while streaming without hashing the whole package.

## Epoch Implications

- The signed SHA-256 hash tree with a single signed root over data blocks is almost exactly Epoch's signed manifest over content-addressed chunks (ADR-0015); per-block verification while streaming is Epoch's incremental-verify goal made concrete on a shipping console.
- Region-addressed decrypt-on-access (region ID folded into the AES-XTS data-unit number) is a strong precedent for chunk-range partial residency and targeted checkout (ADR-0016): touch only the ranges you need, verify and decrypt only those.
- Sampler Feedback Streaming, where the GPU samples which mip/texture tiles are actually needed and only those tiles stream into memory, is a direct analog to Epoch's entity-aware sub-asset streaming.
- MSIXVC2 decoupling package layout from patch delta size is the same lesson Epoch draws from content-defined chunking: content identity, not physical layout, should drive what transfers.
- The XVC descriptor (content ID, key IDs, the chunks used to update packages, per-region offsets/lengths/key IDs in the first unencrypted blocks) is a working example of a self-describing, verifiable content map that Epoch's signed events can generalize.
