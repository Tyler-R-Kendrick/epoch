---
product: X (x.com / Twitter)
design_sources:
  - https://x.com/
  - https://developer.x.com/ (embed / brand color history)
  - Public product observation of timeline, post, and action row (2024–2026)
  - Historical Chirp typography notes from Twitter redesign era
last_researched: 2026-08-01
---

# Design

## Look And Feel

X is a **high-density social timeline** with thin chrome and aggressive scan optimization. Default dark mode leans pure black; light mode is pure white. The post is the atomic unit: avatar, display name, handle, relative time, body, optional media, then a fixed action row (reply · repost · like · views · share).

Visual character:

- Left icon rail (desktop) with primary destinations; center timeline; optional right rail for trends/who-to-follow.
- 1px hairline separators between posts — not cards.
- Action icons are monochrome until interacted with; counts sit beside icons.
- Verified/social-proof marks sit inline with the display name.
- Accent historically Twitter blue (`#1D9BF0` family); brand mark is pure black/white "X".
- Typography is tight, high-contrast, system/Chirp-like sans — built for rapid vertical scrolling.

## Design Rules (Extracted)

1. **Timeline scan first.** Every layout choice maximizes posts per viewport and scroll speed.
2. **Hairlines, not cards.** Posts are separated by 1px lines; no stacked elevated cards in the main feed.
3. **Action row is constant.** Reply / repost / like / view affordances never hide behind hover-only on mobile.
4. **Identity line is compact.** `Name · @handle · time` on one line; overflow ellipsizes.
5. **Accent is rare.** Blue is for primary CTA, links, and active states — not full chrome washes.
6. **Contrast extremes.** Pure black / pure white defaults create a "native app" hardness.
7. **Media is edge-to-edge within the post column.** Images/video carry the visual weight.
8. **Icon-first navigation on desktop.** Left rail uses icons (+ labels at wider breakpoints).
9. **Social proof inline.** Checks, counts, and view metrics live next to content, not in side panels.
10. **Minimal radius.** Avatars circular; post containers nearly square; buttons modestly rounded.

## Token Notes (Observed)

| Role | Typical treatment |
|---|---|
| Canvas (dark) | `#000000` |
| Canvas (light) | `#FFFFFF` |
| Divider (dark) | `#2F3336` class |
| Secondary text | Cool gray |
| Accent / links | `#1D9BF0` family |
| Primary CTA | Filled blue pill/rounded rect on compose |
| Radius | High on compose button; low on feed structure |

## Differentiators

- Best-in-class vertical scan density for public short-form.
- Universal action-row grammar copied across social products.
- Extreme light/dark contrast as brand, not just theme.

## What Works

- Instant readability of "who said what, when, and how people reacted."
- Consistent post grammar across devices.
- Compose affordance is always obvious (large blue button / sticky compose).

## UX Breakdowns

- Pure black can feel harsh; long sessions fatiguing for some users.
- Engagement metrics can dominate meaning (count theater).
- Weak workspace/channel model — not designed for durable project collaboration.
- Right-rail clutter (trends, ads, suggestions) competes with the timeline.

## Feed Structure (home)

X’s product **is** the feed:

- Vertical timeline with hairline separators between posts.
- Tabs / modes for Following vs algorithmic For you.
- Compact identity line (`Name · @handle · time`) and constant action row.
- Home is never a single-workspace channel list.

## Epoch Steal / Reject

| Steal | Reject |
|---|---|
| Hairline feed separators + high scan density | Pure black as default identity |
| Compact identity + meta line | Public metric theater as primary UX |
| Feed as default home chrome | Global viral timeline as *only* home |
| Rare accent discipline | Engagement-count-first hierarchy |
