---
product: Xbox Series X|S
gossip_sources:
  - https://xboxoneresearch.github.io/wiki/operating-system/xbox-virtual-drive/
  - https://support.xbox.com/en-US/help/games-apps/game-setup-and-play/get-back-to-your-game-instantly-with-quick-resume
  - https://news.xbox.com/en-us/2020/06/15/what-is-smart-delivery-xbox-series-x/
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/overviews/streaming_install-intelligent_delivery
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/intelligentdelivery-device
---

# Gossip

## What People Say

- Players broadly praise Quick Resume for restoring multiple suspended games in seconds and surviving reboots and updates.
- Smart Delivery is well received as a clean "buy once, get the right build" story across console generations.
- Reverse-engineering communities (XboxOneResearch, xvdtool) document the XVD/XVC container, its AES-XTS regions, and the SHA-256 hash tree in detail, and note admiration for the region-addressed, per-block-verifiable design (secondary).

## Bug And Friction Themes

- Quick Resume occasionally fails for titles with online sessions, licensing, or server-side state, forcing a full restart.
- Streaming installs can leave players briefly blocked when needed content has not yet streamed in behind the launch chunk.
- Package-format opacity means developers debugging install issues rely on community tooling and reverse-engineered specs (secondary).
- The MSIXVC vs MSIXVC2 distinction around whether layout changes inflate patches can confuse packaging decisions.

## Product Risk For Epoch

- Xbox demonstrates a signed-root SHA-256 hash tree with per-block streaming verification in production, so Epoch's signed-manifest-over-chunks design must at least match this and add legible multi-actor provenance.
- Region-addressed decrypt-on-access sets expectations that partial residency and integrity coexist; Epoch's chunk-range checkout should meet that bar.
- Sampler Feedback Streaming shows sub-asset partial residency is achievable and valued, pressuring Epoch's entity-aware streaming to be genuinely fine-grained.
- The reliance on reverse-engineering for format understanding is an opportunity: Epoch's openly specified signed events can be more auditable than a proprietary secured container.
