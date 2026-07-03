---
product: Valve SteamPipe
design_sources:
  - https://partner.steamgames.com/doc/sdk/uploading
  - https://partner.steamgames.com/doc/store/application/builds
  - https://partner.steamgames.com/doc/sdk/updating/partial_depot
  - https://github.com/ValveSoftware/Fossilize
  - https://steamdb.info/faq/
---

# Design

## Look And Feel

SteamPipe has no end-user design surface of its own; players experience it through the Steam client's download manager, which shows depot-level progress, streaming-install readiness, and background update state. The developer-facing "design" is the build pipeline: depot definitions, manifests, BuildIDs, and the Steamworks partner build UI. Shader delivery on Steam Deck surfaces as a background "processing" step and shader cache downloads.

## Open Design Assets

- Valve documents the build and depot model (uploading, builds, partial depot updates) on the Steamworks partner site, but does not publish a design-token system.
- Fossilize (github.com/ValveSoftware/Fossilize) is open source: a serialization format plus Vulkan layer that records VkPipeline, VkShaderModule, VkRenderPass and related objects; serialized `.foz` files are deflated JSON plus deflated varint SPIR-V, with objects referenced by hash keys and a format robust to truncated writes.
- On-disk chunk-store layout (.csm/.csd pairs) is documented only through community reverse-engineering tools (secondary).

## Differentiators

- Content addressing is invisible: developers reason about files and depots while the system reuses chunks across builds automatically.
- HTTP-only delivery makes the whole system CDN-native and firewall-friendly without a bespoke protocol.
- Shader pre-caching moves expensive pipeline compilation off the player's device: Steam captures pipeline creation via the Fossilize layer, uploads `.foz` to Valve, Valve's build farm replays per GPU/driver to produce native pipeline caches, and those ship as shader depots via background updates so the Deck downloads a precompiled cache for its exact GPU/driver.

## What Works

- Cross-build chunk reuse (content-addressed by chunk hash) gives deduplication and delta patching in a single mechanism, mirroring what Epoch wants from content-defined chunking plus signed manifests.
- The manifest-of-hashes build model is a clean, verifiable description of a release that Epoch's signed-event model can emulate at finer granularity.
- Play-while-downloading through depot ordering is a proven pattern for the targeted partial residency Epoch is pursuing.
- Fossilize's hash-keyed, truncation-robust serialization is a good reference for content-addressed artifact formats that must survive partial writes.

## UX Breakdowns

- Fixed ~1 MiB chunk boundaries shift on byte insertion, so developers must manually align pak boundaries to SteamPipe boundaries to keep patch sizes small; a poorly aligned build can rewrite far more chunks than it changed. Epoch's content-defined chunking is the direct answer to this friction.
- Shader-cache rebuilds re-trigger on install and on any GPU/driver change and can be large (~1-2 GB reported, secondary), producing surprising background downloads.
- Content addressing is opaque to developers: a small logical change can produce a large patch with no obvious explanation unless they understand the fixed-boundary chunker.
- The system delivers efficient bytes and integrity by hash but not per-actor signed provenance or review semantics over changes, which is where Epoch's signed-event model differentiates.
