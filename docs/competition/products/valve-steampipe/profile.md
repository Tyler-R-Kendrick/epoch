---
product: Valve SteamPipe
slug: valve-steampipe
category: game_asset_streaming_delivery
primary_sources:
  - https://partner.steamgames.com/doc/sdk/uploading
  - https://partner.steamgames.com/doc/store/application/builds
  - https://partner.steamgames.com/doc/sdk/updating/partial_depot
  - https://github.com/ValveSoftware/Fossilize
  - https://steamdb.info/faq/
---

# Valve SteamPipe

Valve SteamPipe is Steam's content delivery system for shipping, patching, and streaming very large game installs to hundreds of millions of clients. It splits every file into roughly 1 MiB chunks, compresses and encrypts each chunk individually, and serves them over plain HTTP from edge CDNs. It is relevant to Epoch as a mature, planet-scale example of content-addressed chunking, manifest-of-hashes builds, and cross-build chunk reuse for delta patching.

## Competitive Relevance

- SteamPipe chunks every file at a fixed ~1 MiB boundary; each chunk is independently compressed and encrypted and stays that way at rest on the CDN until the client downloads, decrypts, and expands it.
- Delivery is over HTTP so chunks are edge/CDN cacheable and firewall-friendly, decoupling content addressing from any custom transport.
- A depot is a logical group of files (identified by a depot ID); installing a title mounts its depots to disk. A manifest lists every file with size, a SHA1 hash, and flags; each manifest has a unique 64-bit manifest ID and each build carries a global BuildID.
- On update, SteamPipe reuses chunks already present from the previous build (content-addressed by chunk hash), combining deduplication and binary delta in one pass; only new or changed regions become new chunks.
- Patching is binary-delta at chunk granularity: the client fetches only chunks whose hash it does not already have. "Partial Depot Update Instructions" allow targeted updates to a subset of a depot.
- Play-while-downloading / streaming install is achieved by depot ordering and preload so a title becomes playable before the full install completes.
- The compression codec is documented only as "compressed"; secondary sources report LZMA historically and newer zstd (secondary, not confirmed by Valve docs). The on-disk chunk store using paired .csm index and .csd data files is described by reverse-engineering tools (secondary).

## Epoch Implications

- SteamPipe's fixed ~1 MiB boundaries mean a byte insertion shifts every subsequent boundary, forcing devs to hand-align pak boundaries to SteamPipe boundaries to keep patches small. This is the clearest real-world argument for Epoch's content-defined chunking (ADR-0015), which keeps boundaries stable across insertions.
- Content-addressed chunk reuse across builds is exactly Epoch's deduplication goal; SteamPipe proves the model works at massive scale.
- The manifest-of-hashes (per-file SHA1 plus flags, under a signed build identity) maps closely to Epoch's signed Merkle manifest direction, though SteamPipe uses SHA1 where Epoch uses SHA-256.
- Play-while-downloading via depot ordering is a concrete precedent for Epoch's targeted partial checkout and partial residency (ADR-0016): materialize the working set first, hydrate the rest lazily.
- Steam's need to manually align content to fixed boundaries is the failure mode Epoch should avoid by making chunk boundaries content-defined rather than layout-dependent.
