---
product: PlayStation PlayGo
slug: playstation-playgo
category: game_asset_streaming_delivery
primary_sources:
  - https://www.psdevwiki.com/ps4/PlayGo
  - https://www.psdevwiki.com/ps4/Playgo-manifest.xml
  - https://www.psdevwiki.com/ps4/Playgo-chunk.dat
  - https://github.com/drakmor/pgo_stub
---

# PlayStation PlayGo

PlayStation PlayGo is Sony's chunked progressive-install system that lets a game start with only its first chunk on disk while subsequent chunks download and install in the background. There is no official public documentation; everything here is drawn from the PS4 Dev Wiki, the pgo_stub homebrew module, and SDK-leak reporting, and should be treated as secondary and uncertain throughout. It is relevant to Epoch as a declarative minimum-working-set and language-mask partial-residency model, and as a cautionary contrast on the lack of a public spec and integrity story.

## Competitive Relevance

- PlayGo enables immediate start with only the first chunk on disk; subsequent chunks download and install independently via dedicated I/O and are relinked or copied into place when complete (install-as-you-play). (Per PS4 Dev Wiki, not official.)
- Developers assign files to chunks; a game can have up to roughly 100 chunks (dev-wiki figure, uncertain; the pgo_stub test module defaults to 1000). There is reportedly no per-chunk size limit.
- Chunk install order can be reprioritized at runtime as the player progresses.
- Games use the PlayGo API (libScePlayGo / scesPlayGo*): open/close, init, progress, ETA, optional-chunk queries, install-speed, language mask, and disc-required checks. (Per reverse-engineering wikis, not official.)
- A game defines scenarios in playgo-manifest.xml: each scenario has a scenario ID, type, initial-chunk count, label, and references chunk ranges; the initial chunks are the minimum needed to begin that mode (e.g. multiplayer vs single-player). Orbis Publishing Tools lay out the package in intended streaming order.
- playgo-chunk.dat tracks chunk state (installed/available) and language masks; a 64-bit language mask governs which language chunks are resident.
- Reported to be extended in the PS5 SDK (~v13) as Sony's "Smart Delivery" analog, organizing chunks per target (PS4/PS4 Pro/PS5/PS5 Pro) - this is tech-press SDK-leak reporting and is uncertain.

## Epoch Implications

- A scenario's "initial chunks" is a declarative minimum working set, closely mirroring Epoch's targeted/sparse checkout of just the chunks a particular view needs (ADR-0016).
- Runtime chunk reprioritization as the player progresses is a precedent for Epoch's lazy, on-access hydration of content-addressed chunks.
- The 64-bit language mask selecting which language chunks are resident is a concrete form of entity/attribute-aware partial residency, aligning with Epoch's entity-aware streaming direction.
- The key contrast: PlayGo has no public spec and, from available sources, no described content-hash or signed-integrity story. This underscores Epoch's differentiator, a signed manifest over content-addressed chunks with verifiable provenance, which PlayGo appears to lack (or at least does not publicly document).
- PlayGo's declarative manifest of scenarios and chunk ranges is a useful shape for Epoch's signed manifests, but Epoch should attach content addressing and signatures that PlayGo does not expose.
