---
product: Valve SteamPipe
marketing_sources:
  - https://partner.steamgames.com/doc/sdk/uploading
  - https://partner.steamgames.com/doc/store/application/builds
  - https://partner.steamgames.com/doc/sdk/updating/partial_depot
  - https://github.com/ValveSoftware/Fossilize
  - https://steamdb.info/faq/
---

# Marketing

## Target Customers

- Game developers and publishers shipping large installs and frequent patches to a global player base.
- Studios that need efficient delta patching so returning players download only changed content.
- Teams targeting Steam Deck that need precompiled shader caches to avoid first-run stutter.
- Live-service titles that patch often and need small, fast updates.

## Positioning

SteamPipe is positioned to developers as the invisible, reliable backbone of Steam content delivery: HTTP-based, CDN-cacheable, content-addressed chunking with automatic cross-build reuse. Valve markets the outcomes (fast downloads, small patches, streaming installs, no first-run shader stutter on Deck) rather than the chunking mechanics, which are mostly documented as build and depot behavior.

## Customer Model

- SteamPipe is infrastructure bundled with the Steam platform; developers adopt it by publishing depots and builds through Steamworks.
- Capture is via the Steam storefront and platform lock-in rather than a standalone storage product.
- Fossilize is open source, giving the shader-caching mechanism public visibility and reuse beyond Steam.
- Reverse-engineering communities (SteamDB and others) fill documentation gaps around chunk stores and codecs.

## Captures

- AAA and indie developers who want zero-effort delta patching and streaming installs.
- Steam Deck titles that benefit from Valve's build-farm shader precompilation.
- Publishers with frequent live-service updates.
- Players who get small, resumable, background updates without managing any of it.

## Misses

- Developers who need content-defined chunking to avoid manual pak-boundary alignment against fixed ~1 MiB boundaries.
- Teams wanting per-actor signed provenance or review semantics over content changes, not just hash integrity.
- Anyone needing a vendor-neutral, cross-platform content-addressed store rather than Steam-bound infrastructure.
- Workflows needing semantic diffs of assets rather than opaque chunk-level byte deltas.
