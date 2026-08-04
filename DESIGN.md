---
version: alpha
name: Epoch Community
description: Signed civic workshop interface for channel-first repository collaboration. Competes on polish with Slack density, Telegram restraint, X scan rhythm, and Bluesky surface quality — without chat cosplay or metric theater.
colors:
  primary: "#0f1614"
  secondary: "#5c6762"
  tertiary: "#b4532f"
  neutral: "#f3f6f4"
  surface: "#f3f6f4"
  surface-raised: "#ffffff"
  surface-sunken: "#e8eeeb"
  ink: "#0f1614"
  ink-soft: "#2d3531"
  ink-faint: "#a0aaa4"
  muted: "#5c6762"
  line: "#d7e0db"
  line-strong: "#b0bfb7"
  accent: "#b4532f"
  accent-strong: "#8f3f28"
  teal: "#2a6f6c"
  teal-deep: "#215955"
  teal-hover: "#32807c"
  mint: "#d5ebe3"
  mint-strong: "#b7d8c8"
  gold: "#c9a24a"
  avatar: "#1f3d34"
  avatar-ink: "#e8f3ee"
  rail: "#101714"
  rail-text: "#d7e2dc"
  rail-muted: "#8fa099"
  rail-hover: "#1a2420"
  rail-active: "#24322c"
  rail-line: "#1c2622"
  success: "#1a5c3e"
  warning-bg: "#fff6df"
  warning-ink: "#5b4420"
  warning-line: "#e0c991"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0em"
  meta:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.surface-raised}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "36px"
  button-intent:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "36px"
  channel-rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    typography: "{typography.body}"
    padding: "12px 10px"
  channel-button:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    height: "32px"
  channel-button-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
  feed-message:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "8px 18px"
  feed-message-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
  composer:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  reaction:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "28px"
  status-live:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.teal}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  status-snapshot:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  trust-meta:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
  focus-ring:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.sm}"
  surface-sunken-panel:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  gold-signal:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
  hairline-divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    height: "1px"
  channel-button-hover:
    backgroundColor: "{colors.rail-hover}"
    textColor: "{colors.rail-text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
  status-success-dot:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.xs}"
    size: "8px"
  accent-chip:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  accent-mark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "2px 4px"
  avatar:
    backgroundColor: "{colors.avatar}"
    textColor: "{colors.avatar-ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    size: "34px"
  message-copy:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  meta-separator:
    backgroundColor: "{colors.ink-faint}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    height: "1px"
  hairline-strong:
    backgroundColor: "{colors.line-strong}"
    textColor: "{colors.ink}"
    height: "1px"
  button-intent-hover:
    backgroundColor: "{colors.teal-hover}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  intent-edge:
    backgroundColor: "{colors.teal-deep}"
    textColor: "{colors.surface-raised}"
    height: "1px"
  live-hairline:
    backgroundColor: "{colors.mint-strong}"
    textColor: "{colors.ink}"
    height: "1px"
  snapshot-hairline:
    backgroundColor: "{colors.warning-line}"
    textColor: "{colors.warning-ink}"
    height: "1px"
  rail-divider:
    backgroundColor: "{colors.rail-line}"
    textColor: "{colors.rail-text}"
    height: "1px"
---

# Design System: Epoch Community

## 1. Overview

**Creative North Star: "The Signed Civic Workshop"**

Epoch Community is a channel-first workbench for signed repository collaboration. It must feel as **sleek and intentional** as the best messaging and social products people already live in — Slack's place model, Telegram's restraint, X's scan rhythm, Bluesky's clean light surfaces — while remaining unmistakably a **trust-first workshop**, not a chat app or viral feed.

The interface rejects default browser styling, generic SaaS hero drama, decorative glass, gradient text, pill spam, purple-blue AI-slop gradients, dark terminal cosplay, and pure-black social fatigue. Cards are rare. Messages are flat work rows. Signatures and anchors are first-class meta, never fake presence theater.

**Competitive synthesis (steal / refuse):**

| Source | Steal | Refuse |
|---|---|---|
| Slack | Dark rail, `#channel` places, sticky composer, hover secondary actions, dense expert scan | Aubergine brand wash, huddle/presence chrome, feature sprawl |
| Telegram | Content-first restraint, single rare accent discipline, instant action feedback | Message bubbles, avatar-only identity, sticker-first energy |
| X | Hairline feed rhythm, compact identity line, constant secondary action grammar | Pure black default, metric theater, global viral home |
| Bluesky | Clean white feed, soft borders, approachable hierarchy, visible handles/identity | Generic sky-blue brand, algorithm-tab cosplay as core |

**Key characteristics:**

- Dark charcoal rail + clean white feed (Slack place grammar, Bluesky surface quality).
- High scan density with calm surfaces (X rhythm without hostility).
- Copper action rarity + teal workflow support + gold trust-only signal.
- System typography with strong weights; mono only for anchors/signatures.
- Rectangular controls ≤8px radius; no pills, glass, or gradient text.
- Live vs snapshot honesty is always visible when the API is not connected.
- **Craft delight and proof wonder are required.** Personas reject lifeless “correct” shells. Playfulness means responsive, warm, intentional place identity — never AI-slop spectacle. Wonder comes from signed civic proof and clear community belonging.

**Persona enforcement:** Community UI is incomplete until adversarial persona critique passes (see [community-human-centered-design.md](docs/community-human-centered-design.md#adversarial-design-critique-protocol)).

## 2. Colors

The palette is a cool civic workshop: mist page edge, pure raised work surface, deep ink, copper action, teal support, gold verification, charcoal rail.

### Primary

- **Primary / Civic Ink (`primary`, `ink`)**: Default text, primary filled buttons, structural weight. Near-black green-charcoal — deeper and sleeker than mid gray-green.
- **Copper Action (`accent`, `tertiary`)**: The sole interaction driver for high-signal actions, focus rings, and rare emphasis. Use sparingly (Telegram/X accent rarity).

### Secondary

- **Registry Teal (`teal`)**: Intent/workflow support — not the primary brand wash. `teal-deep` edges intent buttons; `teal-hover` is the intent hover fill.
- **Verified Gold (`gold`)**: Trust and verification only (signed history, verified state). Never decorative.
- **Quiet Muted (`muted`, `secondary`)**: Meta, timestamps, secondary labels.
- **Soft Ink (`ink-soft`)**: Long-form body copy inside messages and threads — one step quieter than `ink`.
- **Faint Ink (`ink-faint`)**: The quietest glyphs — `·` separators between meta spans.
- **Identity Pine (`avatar`, `avatar-ink`)**: Square-soft avatar and brand-mark fill with its pale mint initial color.

### Neutral surfaces

- **Mist / Neutral (`surface`, `neutral`)**: Page edge and subtle hover wash.
- **Raised White (`surface-raised`)**: Main feed and composer — clean like Bluesky/X light, not parchment-muddy.
- **Sunken (`surface-sunken`)**: Thread nests and recessed panels.
- **Ledger Line (`line`)**: Hairline borders and dividers. `line-strong` borders secondary buttons and hover states that need one more step of contrast.
- **Mint Line (`mint-strong`)**: Border for mint/live honesty surfaces.
- **Warning Line (`warning-line`)**: Border for snapshot/warning honesty surfaces and badges.

### Rail

- **Rail (`rail`)**: Deep charcoal green for orientation chrome.
- **Rail text / muted / hover / active**: Readable hierarchy on dark chrome; active channel is clearly selected without purple.
- **Rail line (`rail-line`)**: Hairline section dividers on the dark rail.

### Named rules

**The Surface Is Product Rule.** Never ship browser-default white/gray without tokens. Feed uses `surface-raised`; page edge may use `surface`.

**The Copper Rarity Rule.** Copper is for action and attention only — never large inactive fills.

**The Rail Is Place, Feed Is Work Rule.** Dark rail orients; light feed does the work (Slack grammar).

**The Trust Color Rule.** Gold and signature meta mark accountability. Do not invent presence dots or vanity metrics.

## 3. Typography

**Display / Body:** System UI stack (platform-native).  
**Meta / Mono:** `ui-monospace` stack for anchors, signatures, repo paths only.

Typography is operational and sleek: slightly tighter than marketing sites, stronger author weight (X), readable body (Bluesky), no decorative display fonts.

### Hierarchy

- **Display** (750, 2.5rem): Rare — marketing or empty-state only, not the app shell header.
- **Headline** (700, 1.25rem): Shell titles (repo name area).
- **Title** (700, 0.98rem): Message titles, active channel name, strong labels.
- **Body** (400, 0.94rem, 1.5): Message content; max ~70ch.
- **Label** (650, 0.78rem): Buttons, eyebrows, counts.
- **Meta** (500, 0.72rem mono): `anchor:…`, `sig:…`, paths.

### Named rules

**The Product Type Rule.** No Fraunces/Inter-display/marketing fonts in Community UI.

**The Author First Rule.** Display name is the strongest text in a message row; role and time are muted; mono trust line is quietest.

## 4. Layout

Community Web is a **dual-plane product**:

### Plane A — Community (default home, Discord lesson)

A **community space** owns social + work channels. No repository is required to chat in `#general` or `#showcase`.

1. **Rail**: brand, Network Feed entry, **Communities** list, active community **Channels**, **Linked projects**.
2. **Shell**: community header → honesty → channel toolbar → messages + sticky composer.

### Plane B — Network Feed (cross-community discovery)

ATProto-observed follows/stars/releases/contributions across communities (X/Tangled/GitHub grammar).

### Plane C — Linked project (forge lists)

Issues / Changes for a repository hanging off a community — secondary to hangout channels.

### Density

- Network feed and message rows ≈ `8px 18px` (Slack/X scan).
- Channel rows ≈ 32px tall; community switcher always visible (Discord).
- Hairline separators and hover washes instead of stacked cards.
- Composer is sticky on community channels.
- Max content width for body text ~70ch.

### Responsive

- Below ~800px: single column; rail stacks above feed; channel list height-capped.
- Touch targets for primary actions ≥32px; critical actions prefer ≥36px.

### Named rules

**The Community Owns Channels Rule.** Channels belong to a community space (Discord server analog), not exclusively to a git repo.

**The Hangout Without A Repo Rule.** `#general` / `#showcase` must work with zero linked repositories.

**The Linked Project Is Secondary Rule.** Repos appear under a community as linked projects; they do not replace the community switcher.

**The Network Is Discovery Rule.** Cross-community Dev Feed is for observation; daily life is inside a community channel.

**The Contribution Verb Rule.** Network feed items lead with `@actor` + verb + object (Tangled/GitHub).

**The Composer Never Leaves Rule.** Writing controls stay sticky to the active community channel.

**The Flat Feed Rule.** Feed items are rows with hover wash, not elevated cards.

## 5. Elevation

Tonal layering first; shadows second and rare.

### Shadow vocabulary

- **Hairline only (default):** Borders via `line` / rail edge colors.
- **Low product lift:** Optional `0 1px 0 rgba(15, 22, 20, 0.04)` on composer top edge or framed trays — depth, not decoration.
- **No modal glass / blur stacks** in the default shell.

### Named rules

**The Flat Until Useful Rule.** Surfaces stay flat at rest. Hover may tint; it must not grow a marketing shadow.

## 6. Shapes

- **xs 2px:** badges, mono chips.
- **sm 4px:** buttons, inputs, channel rows, avatars (square-soft, not circles-as-identity).
- **md 8px:** composer frame, action tray, history panel — maximum for product chrome.

### Named rules

**The No Pill Rule.** Do not ship fully rounded pills, capsules, or bubble messages.

**The Square Avatar Rule.** Avatars are short rounded squares (workbench), not social circles — unless a future profile surface explicitly needs circles.

## 7. Components

### Channel rail

- Background `rail`; text `rail-text` / `rail-muted`.
- Active channel / active repo: `rail-active` fill, white text, optional 2px copper leading edge.
- Hover: `rail-hover` wash.
- Counts are tabular, muted, end-aligned.
- Product mode **Dev Feed** is always available above the repository list.

### Dev Feed items

- Avatar + `@handle` + verb + object (repo/issue/proposal/actor/release).
- Quiet mono trust line: `sig` / `anchor` / `atUri` / source.
- Secondary actions: Open workspace, Open #channel — not engagement counts.
- Tabs use copper underline for selected state (Bluesky-style tabs, Epoch accent).

### Feed messages

- Grid: avatar (2.15rem) + body.
- Hover: `neutral` wash; selected: slightly deeper sunken tint.
- Meta line: **author** · role · time · optional honesty badge.
- Footer trust line: mono anchor/sig — present, quiet.
- Reaction controls: rectangular bordered buttons, not emoji-only ghosts.

### Actions

- **Primary:** ink fill, white text; hover shifts toward `accent-strong` for high-signal commit actions when appropriate.
- **Secondary:** white fill, line border, ink text.
- **Intent:** teal fill (workflow), not copper (copper stays rare).
- Action tray uses a constant row grammar (X) with rectangular Slack-like tools.

### Composer

- Sticky bottom; white surface; 1px line top border.
- Textarea: white, line border, 4px radius, focus copper ring.
- Send is a real button (filled), not plain text.

### Honesty banners

- Live: mint background, teal ink.
- Snapshot/offline: warning-bg / warning-ink — never silent.

### Focus

- 2px copper focus ring, 2px offset, on all interactive controls.

## 8. Do's and Don'ts

### Do

- **Do** expose CSS custom properties on `:root` matching these tokens for tests and agents.
- **Do** keep the dark rail + white feed split.
- **Do** keep density high enough to scan; prefer hover washes over card stacks.
- **Do** show live vs snapshot honesty.
- **Do** keep signature/anchor meta visible and quiet.
- **Do** use rectangular, obvious buttons for real actions.
- **Do** validate this file with `npm run design:lint` (Google `@google/design.md`).

### Don't

- **Don't** ship bubbles, pills, glassmorphism, gradient text, or purple-blue AI chrome.
- **Don't** use pure black (`#000`) as the default brand surface.
- **Don't** invent fake online presence or vanity engagement metrics.
- **Don't** hide dead controls that look clickable.
- **Don't** replace system type with decorative display fonts.
- **Don't** let trust meta overpower message body hierarchy.
