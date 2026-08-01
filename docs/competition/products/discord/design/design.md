---
product: Discord
design_sources:
  - https://discord.com/
  - https://discord.com/branding
  - https://discord.com/safety
  - Public desktop/web product observation (server list + channel list + message pane)
  - docs/evidence/design-screenshots/discord-marketing.png
  - docs/evidence/design-screenshots/discord-app.png
last_researched: 2026-08-01
---

# Design

## Look And Feel

Discord is a **community-first messaging product**. The atomic place is not a repository or a global viral feed — it is a **server (community)** with its own membership, channel list, roles, and culture. Developers use Discord *because* community conversation is independent of any single GitHub project: people hang out in `#general`, ship memes in `#showcase`, and only sometimes drop repo links.

Visual character:

- **Three-zone chrome (desktop):** ultra-narrow **server strip** (community icons) → **channel list** for the active server → **message pane** + optional member list.
- Near-black / charcoal surfaces (`#1e1f22` / `#2b2d31` class), white/gray text, **Blurple** (`#5865F2`) as the primary brand/action accent.
- Channels are plain `#name` rows, grouped by **categories** (text, voice, announcements).
- Messages are flat rows (avatar + author + body), not bubbles; hover reveals react/reply/more.
- Composer is sticky at the bottom of the active channel.
- Unread state is typographic + badges; presence dots are ambient.

## Feed Structure (why this matters for Epoch)

Discord does **not** use “repo → channels” as the only hierarchy.

| Layer | Discord | Implication for Epoch |
|---|---|---|
| Community place | Server / guild | **Community spaces** must exist without a forge repo |
| Topic lanes | `#channels` inside a server | Channels belong to the **community**, not the repo |
| Cross-place discovery | Server discovery, DMs, friends | Optional network/home; not a substitute for community channels |
| Project artifacts | Links/embeds into messages | Repos/issues are **linked objects**, not the only home |

### Community-owned channel grammar

Typical open-source / product Discord layout:

- **Social lanes:** `#welcome`, `#general`, `#introductions`, `#showcase`, `#random`
- **Help lanes:** `#help`, `#support`, `#troubleshooting`
- **Ship lanes:** `#announcements`, `#releases`, `#feedback`
- **Ops lanes:** `#moderation`, `#staff` (role-gated)

Developers live here for **belonging and continuous conversation**. Repos are linked when work crystallizes — they are not the social home.

## Design Rules (Extracted)

1. **Community is the place.** Membership and culture attach to a server, not to a git remote.
2. **Channels are community-scoped.** Switching servers swaps the entire channel list.
3. **Social channels outrank project lists** for day-to-day hangout; project work is optional deep context.
4. **Dark dense chrome, light message hierarchy.** Orientation is dark; content contrast is high.
5. **Composer is per-channel and always present.**
6. **Unread is the primary status system** (not engagement metrics).
7. **Categories organize without nesting chaos.** Two levels: category → channel.
8. **Roles color authors, not the whole UI.**
9. **Server switcher is permanent.** You never lose the list of communities you belong to.
10. **Artifacts are embeds.** Code, issues, and deploys appear *inside* conversation when shared.

## Token Notes (Observed)

| Role | Typical treatment |
|---|---|
| Brand / accent | Blurple `#5865F2` |
| Server strip | Near-black |
| Channel rail | Dark charcoal |
| Message pane | Slightly lighter dark (or user theme) |
| Text primary | Near-white |
| Text muted | Cool gray |
| Radius | Modest on controls; messages not bubbles |
| Density | High expert density; compact channel rows |

## Differentiators

- Best-in-class **multi-community** navigation (dozens of servers without losing place).
- Social identity independent of source control.
- Voice/stage as first-class (Epoch non-goal for now, but proves “community ≠ repo”).

## What Works

- Instant mental model: “I’m in *this* community, talking in *this* channel.”
- Low friction for non-code conversation that still supports shipping culture.
- Categories keep large servers scannable.

## UX Breakdowns

- Notification and server overload; FOMO from too many communities.
- Blurple + pure dark can feel gaming-generic for serious civic products.
- Search and history can be weak compared to Slack’s paid search.
- Project work (issues/PRs) remains fragmented unless linked carefully.

## Epoch Steal / Reject

| Steal | Reject |
|---|---|
| Community as first-class place with its own channels | Gaming blurple as brand identity |
| Server/community switcher always visible | Voice/stage as core chrome (this pass) |
| Social channels (#general, #showcase) independent of repos | Presence theater as product center |
| Repo links as secondary “linked projects” | Abandoning signed trust / intent wedge |
| Category-ish grouping of community channels | Dark-only terminal cosplay |
