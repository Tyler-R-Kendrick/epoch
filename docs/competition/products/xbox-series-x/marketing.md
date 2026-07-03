---
product: Xbox Series X|S
marketing_sources:
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/overviews/streaming_install-intelligent_delivery
  - https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/packaging/intelligentdelivery-device
  - https://news.xbox.com/en-us/2020/06/15/what-is-smart-delivery-xbox-series-x/
  - https://support.xbox.com/en-US/help/games-apps/game-setup-and-play/get-back-to-your-game-instantly-with-quick-resume
  - https://xboxoneresearch.github.io/wiki/operating-system/xbox-virtual-drive/
---

# Marketing

## Target Customers

- Game developers shipping large multi-generation titles who need one package to serve Series X, Series S, and older hardware.
- Publishers who want players in-game fast via streaming installs rather than full-download waits.
- Studios optimizing per-locale and per-device installs to save disk and bandwidth.
- Players who value instant resume across multiple suspended games.

## Positioning

Microsoft positions the Series X|S delivery stack around player outcomes: Play As You Download, Smart Delivery (buy once, get the best build per console), and Quick Resume, all underpinned by the Xbox Velocity Architecture. To developers, the GDK positions Intelligent Delivery as fine-grained control over what installs when and where, with MSIXVC2 removing the penalty for reorganizing package layout.

## Customer Model

- The delivery stack is platform infrastructure bundled with the Xbox GDK and console hardware; developers adopt it by packaging with makepkg and defining chunks and specifiers.
- Capture is via the Xbox ecosystem, storefront, and Game Pass rather than a standalone content-delivery product.
- Package internals are proprietary and documented only as behavior; the community fills gaps through reverse-engineering wikis and tools (secondary).
- Consumer features (Smart Delivery, Quick Resume) drive platform loyalty and hardware upgrades.

## Captures

- Cross-generation AAA titles needing one purchase to deliver the right optimized build.
- Large open-world games that benefit from launch-chunk streaming installs.
- Locale-diverse releases that install only needed language chunks.
- Players who switch between many games and rely on Quick Resume.

## Misses

- Developers wanting an open, vendor-neutral content-addressed store rather than Xbox-bound packaging.
- Teams needing per-actor signed provenance and review history, not just a Microsoft-signed integrity root.
- Workflows needing semantic asset diffs rather than block-level streaming deltas.
- Non-console pipelines (server, CI, cross-platform) that cannot use the console's secured virtual-disk format.
