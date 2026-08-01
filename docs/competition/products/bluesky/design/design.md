---
product: Bluesky
design_sources:
  - https://bsky.app/
  - https://docs.bsky.app/
  - https://bsky.social/
  - Public app/web screenshots of feed, post, and profile (2024–2026)
last_researched: 2026-08-01
---

# Design

## Look And Feel

Bluesky is a **soft, approachable social feed** with more breathing room than X and less corporate density than Slack. The default light theme uses clean white surfaces, gentle borders, and a sky-blue accent (`#0085ff` family). Dark mode is soft charcoal rather than pure black. Handles (`@user.bsky.social`) and custom feeds are first-class identity/chrome.

Visual character:

- Centered feed column with modest max-width; navigation tabs (Following / custom feeds).
- Post cards use soft separation (hairline or light card) with slightly more padding than X.
- Avatar circles, display name, handle, relative time — friendly hierarchy.
- Actions: reply, repost, like with soft counts; less metric aggression than X.
- Sky blue for primary buttons, links, and active tabs.
- Typography is system UI, readable, with slightly looser line-height than X.

## Design Rules (Extracted)

1. **Approachable, not austere.** Soft surfaces and sky accent read as welcoming.
2. **Breathing room with still-scan.** More padding than X; still a vertical feed, not a marketing site.
3. **Handle is identity.** `@handle` is always visible; portable AT identity is part of the UI grammar.
4. **Custom feeds as first-class tabs.** Algorithm choice is a visible product surface.
5. **Soft dark mode.** Charcoal/navy surfaces avoid pure-black fatigue.
6. **Accent is sky, used sparingly.** Blue fills primary CTAs and active states only.
7. **Gentler social proof.** Counts exist but do not scream; less "view count theater."
8. **Moderation and labels can appear inline.** Trust/safety UI is part of the feed, not only settings.
9. **Rounded friendliness.** Slightly larger radii on buttons/inputs than X; still not toy-like.
10. **Mobile-first stack, desktop centered column.** Avoids three-rail overload.

## Token Notes (Observed)

| Role | Typical treatment |
|---|---|
| Accent | `#0085ff` sky blue |
| Light surface | White / off-white |
| Dark surface | Soft dark (not pure black) |
| Borders | Light cool gray |
| Primary button | Filled sky blue, pill/rounded |
| Text primary | Near-black |
| Text secondary | Medium gray |

## Differentiators

- AT Protocol identity baked into every profile line.
- Custom feeds as a product differentiator reflected in chrome.
- Softer brand personality than X; more "open social" than "terminal news."

## What Works

- Lower intimidation than enterprise tools or X's hard contrast.
- Clear author identity with portable handles.
- Feed choice (Following vs custom) is understandable.

## UX Breakdowns

- Less density can feel slow for power scanners coming from X.
- Sky-blue + white can read generic "startup social" if not carefully tuned.
- Not a workspace: no channel/project model for durable collaboration.
- AppView centralization can create product-shape sameness even with protocol openness.

## Feed Structure (home)

Bluesky’s home is a **tabbed social feed**:

- Following and custom feed tabs are first-class chrome.
- Handle (`@user.bsky.social`) is always visible identity.
- Soft post rhythm with more padding than X; still vertical scan.
- Protocol identity is product-visible, not buried in settings.

## Epoch Steal / Reject

| Steal | Reject |
|---|---|
| Soft light surfaces + restrained sky-class accent discipline (map to copper/teal, not copy blue) | Generic startup-blue brand |
| Feed tabs as primary navigation | Pure viral feed as *only* surface |
| Soft dark (if dark ships later) over pure black | Algorithm tab chrome without trust context |
| Handle/identity always visible | Social-only post grammar for work artifacts |
