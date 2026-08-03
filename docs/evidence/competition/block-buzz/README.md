---
title: Block Buzz competitive evidence
captured: 2026-08-03
product: block-buzz
license_note: Official screenshots from github.com/block/buzz (Apache-2.0 project). Launch hero from Block public marketing CDN.
---

# Block Buzz evidence

Public UI captures used for Epoch competitor design extraction and the `buzz-power-user` persona.

## Assets

| File | Source | Shows |
|---|---|---|
| [channel-thread.png](channel-thread.png) | `github.com/block/buzz` `docs/assets/screenshots/channel-thread.png` | People + agents coordinating in a project channel / thread |
| [channel-agents.png](channel-agents.png) | same dir | Agents as channel members with reactions |
| [create-channel.png](create-channel.png) | same dir | Add / join channel dialog |
| [media-comments.png](media-comments.png) | same dir | Frame-anchored media comments |
| [launch-hero.png](launch-hero.png) | Block launch post CDN image | Marketing hero for Buzz |

## Capture method

```bash
curl -fsSL https://raw.githubusercontent.com/block/buzz/main/docs/assets/screenshots/<name>.png \
  -o docs/evidence/competition/block-buzz/<name>.png
```

No authenticated buzz.xyz session was used. These are **official published** assets, not private workspace scrapes.

## Related

- Competitor dossier: [docs/competition/products/block-buzz/](../../../competition/products/block-buzz/)
- Epoch Nostr/Buzz identity: [ADR-0023](../../../design-decisions/0023-three-plane-identity-binding.md)
