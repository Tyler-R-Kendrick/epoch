---
title: Community channels comparison (Discord-led)
compared:
  - discord
  - slack
  - github
  - tangled
  - epoch-community
last_researched: 2026-08-01
---

# Community Channels Comparison

## Why Discord is the missing competitor

X, Bluesky, Tangled, and GitHub taught Epoch that **home includes a feed**.  
Discord teaches the other half: **feeds and channels belong to communities**, not to repositories.

Dev teams keep Discord *because*:

1. People need a place to belong that is not a pull request.
2. `#general` / `#showcase` / `#help` are continuous, multi-project, multi-repo.
3. Switching “servers” switches the whole social context.
4. Repos are shared *into* the community as links/embeds — they do not own the social graph.

## Hierarchy compare

| Product | Top place unit | Channels? | Feed? | Repo relation |
|---|---|---|---|---|
| Discord | Server / community | Yes, community-owned | Per-channel message stream | Optional embeds/links |
| Slack | Workspace | Yes, workspace-owned | Channel messages | Integrations/links |
| GitHub | User / org / repo | Discussions (weak) | Dashboard contribution feed | Primary |
| Tangled | Network + repo | Social timeline + forge | Timeline home | Primary forge object |
| Epoch (prior dual-plane) | Global Dev Feed + **repo** | Only after opening a repo | Network Dev Feed | Repo owned channels |
| Epoch (target) | **Community space** | Community-owned social + work channels | Community feed + network discovery | Linked projects under a community |

## Steal for Epoch

From Discord:

- **Community switcher** always visible.
- **Channels list bound to active community**, including social channels with no repo required.
- **Linked repositories** as a secondary section under the community (not the only entry).
- Sticky per-channel composer inside the community.

From prior Epoch work (keep):

- Signed trust meta, intent promotion, agent runs, Issues/Changes when a linked repo is in focus.
- ATProto-observed network feed for cross-community discovery.
- Civic workshop palette (not Blurple gaming chrome).

## Refuse

- Pure Discord clone (voice, Nitro, gaming density).
- Abandoning signed intents for endless chat scrollback.
- Making repositories the only community type.

## Target Epoch IA

```text
Network (cross-community Dev Feed)
Communities
  └─ Epoch Civic Workshop          ← active community
       Channels
         # general   (social)
         # showcase  (social)
         # support   (help)
         # ideas     (work / intents)
         # bugs      (work)
         # agent-runs
         # previews
         # governance
       Linked projects
         epoch/epoch
         epoch/community-kit
```

Default open: **first community → `#general`** (Discord habit), with easy jump to community activity feed and linked repos.

See [Discord design](products/discord/design/design.md) and [community-web-experience.md](../community-web-experience.md).
