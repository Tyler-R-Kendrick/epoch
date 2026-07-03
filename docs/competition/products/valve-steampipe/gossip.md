---
product: Valve SteamPipe
gossip_sources:
  - https://steamdb.info/faq/
  - https://partner.steamgames.com/doc/sdk/uploading
  - https://partner.steamgames.com/doc/sdk/updating/partial_depot
  - https://github.com/ValveSoftware/Fossilize
  - https://partner.steamgames.com/doc/store/application/builds
---

# Gossip

## What People Say

- Developers broadly regard SteamPipe's automatic cross-build chunk reuse as a major win: returning players download only changed content without any manual delta tooling.
- The fixed ~1 MiB boundary behavior is well known in developer circles, and experienced teams deliberately align pak file boundaries to SteamPipe boundaries to minimize patch size (community guidance, not always in official docs).
- Steam Deck shader pre-caching via Fossilize is generally praised for cutting first-run stutter, though the large background shader downloads draw complaints.

## Bug And Friction Themes

- Oversized patches when byte insertions shift fixed chunk boundaries and pak layout was not aligned, so a small change rewrites many chunks.
- Large, sometimes surprising shader-cache downloads (~1-2 GB reported, secondary) re-triggered by GPU or driver changes.
- Opaque chunk-store details (.csm/.csd, codecs) known mainly through reverse-engineering tools, so developers debugging download issues rely on community knowledge (secondary).
- Occasional confusion between manifest IDs, BuildIDs, and depot IDs when scripting or auditing builds.

## Product Risk For Epoch

- SteamPipe sets a high bar for planet-scale content-addressed delta delivery; Epoch must show its content-defined chunking meaningfully beats fixed-boundary chunking on real insert-heavy workloads.
- Steam's manual boundary-alignment burden is a differentiation opportunity: Epoch's chunking should keep boundaries stable across edits without developer effort.
- SteamPipe proves developers accept opaque hash-based integrity; Epoch's added value must be legible signed provenance and review over changes, not just efficient bytes.
- The Fossilize model shows content-addressed, hash-keyed artifact formats can be robust and open, a pattern Epoch's signed manifests can learn from.
