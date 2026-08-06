---
version: alpha
name: Epoch Community
description: Signed civic workshop interface for channel-first repository collaboration. Competes on polish with Slack density, Telegram restraint, X scan rhythm, and Bluesky surface quality — without chat cosplay or metric theater.
colors:
  primary: "#1a1a17"
  secondary: "#5f6058"
  tertiary: "#a300a3"
  neutral: "#f4f2ea"
  surface: "#f4f2ea"
  surface-raised: "#ffffff"
  surface-sunken: "#e6e3d7"
  ink: "#1a1a17"
  ink-soft: "#33342d"
  ink-faint: "#8d8e84"
  muted: "#5f6058"
  line: "#d5d2c4"
  line-strong: "#a8a596"
  accent: "#a300a3"
  accent-strong: "#7a007a"
  runnable: "#ffffff"
  rough: "#cde3bb"
  rough-strong: "#9dc384"
  open-land: "#f8ea9f"
  open-land-strong: "#e0cc63"
  marsh: "#a5d8ec"
  marsh-strong: "#6bb6d6"
  contour: "#8a5a2a"
  contour-soft: "#d8b48c"
  out-of-bounds: "#b52a20"
  control: "#a300a3"
  gold: "#b8860b"
  teal: "#1f6f5c"
  teal-deep: "#175346"
  teal-hover: "#1c6554"
  mint: "#d4ebe0"
  mint-strong: "#a9d4c1"
  avatar: "#2b2b26"
  avatar-ink: "#f4f2ea"
  rail: "#f4f2ea"
  rail-text: "#1a1a17"
  rail-muted: "#5f6058"
  rail-hover: "#e9e6db"
  rail-active: "#ffffff"
  rail-line: "#d5d2c4"
  success: "#1f6f5c"
  warning-bg: "#fdf3d4"
  warning-ink: "#6b4e0c"
  warning-line: "#d8b44a"
typography:
  display:
    fontFamily: "'Helvetica Neue', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Helvetica Neue', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Helvetica Neue', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  body:
    fontFamily: "'Helvetica Neue', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "'Helvetica Neue', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.06em"
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
    textColor: "{colors.rail-text}"
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
    textColor: "{colors.ink}"
    height: "1px"
  rail-divider:
    backgroundColor: "{colors.rail-line}"
    textColor: "{colors.rail-text}"
    height: "1px"
  terrain-runnable:
    backgroundColor: "{colors.runnable}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  terrain-rough:
    backgroundColor: "{colors.rough}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  terrain-rough-edge:
    backgroundColor: "{colors.rough-strong}"
    textColor: "{colors.ink}"
    height: "1px"
  terrain-open-land:
    backgroundColor: "{colors.open-land}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
  terrain-open-land-edge:
    backgroundColor: "{colors.open-land-strong}"
    textColor: "{colors.ink}"
    height: "1px"
  terrain-marsh:
    backgroundColor: "{colors.marsh}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
  terrain-marsh-edge:
    backgroundColor: "{colors.marsh-strong}"
    textColor: "{colors.ink}"
    height: "1px"
  contour-mark:
    backgroundColor: "{colors.contour}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
  contour-soft-wash:
    backgroundColor: "{colors.contour-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
  out-of-bounds-alert:
    backgroundColor: "{colors.out-of-bounds}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  control-mark:
    backgroundColor: "{colors.control}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    size: "8px"
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

**Persona enforcement:** Community UI is incomplete until adversarial persona critique passes (see [community-human-centered-design.md](../../community-human-centered-design.md#adversarial-design-critique-protocol)).

## 2. Colors

The palette is an orienteering legend. Every ink means exactly one thing, and a
reader learns the vocabulary by consulting the legend rather than by reading a
sentence about it. This replaces explanation with notation — the answer to a
product that once spent 54% of its text explaining itself.

### The legend

Terrain inks describe *where you are*. They are grounds, never emphasis.

- **Runnable (`runnable`)** — social channel. Open going, no barrier to entry:
  `#general`, `#showcase`. White, because a hangout should not look like work.
- **Rough (`rough`)** — work channel. Slower going, still open to anyone:
  `#ideas`, `#bugs`, `#agent-runs`. `rough-strong` for its border.
- **Open land (`open-land`)** — showcase and celebration surfaces.
  `open-land-strong` for its border.
- **Marsh (`marsh`)** — anchored to code. A message tied to a file, a line, or
  an agent run carries marsh, because it is where the terrain gets specific.
  `marsh-strong` for its border.
- **Contour (`contour`)** — structural rules, dividers, and the ruling of the
  page. Contours are the truth of the ground and never shout; `contour-soft` is
  the hairline weight.

Course inks describe *what is happening*. They are reserved and rare.

- **Control (`control`, `accent`, `tertiary`)** — the active leg. This ink is
  reserved for the path from conversation to signed work: control circles,
  the leg line, the promote and sign actions, and focus. Nothing decorative may
  wear it. `accent-strong` is its pressed state.
- **Out of bounds (`out-of-bounds`)** — destructive and forbidden. Moderation
  removal, failed signature, and anything that cannot be undone.
- **Gold (`gold`)** — trust and verification only, as before. Signature marks
  and verified state, never decoration.

Support inks carry state that is not terrain and not the course.

- **Teal (`teal`, `teal-deep`, `teal-hover`)** — intent and workflow support.
- **Mint (`mint`, `mint-strong`)** — live and healthy state.
- **Warning (`warning-bg`, `warning-ink`, `warning-line`)** — snapshot,
  degraded, and stale state. Never silent.

### Neutral surfaces

- **Paper (`surface`, `neutral`)** — the page ground the map is printed on.
- **Raised (`surface-raised`)** — the sheet the terrain and content sit on.
- **Sunken (`surface-sunken`)** — recessed panels and nested threads.
- **Line / line-strong** — hairline and emphasis rules.
- **Ink / ink-soft / ink-faint / muted** — text weights, darkest to quietest.

### Rail

The rail is **light** in this world. ISOM prints its legend on the same paper as
its map; a dark rail would make orientation a different medium from the work.

- **Rail (`rail`)** — paper, one step down from the raised sheet.
- **Rail text / muted / hover / active** — hierarchy on paper; the active
  channel is marked by the control ink and by weight, never by colour alone.
- **Rail line (`rail-line`)** — contour hairline between legend sections.

### Named rules

**The Legend Rule.** Every ink in the product appears in the legend with exactly
one meaning. An ink used for two things is a defect, not a style choice.

**The Reserved Course Rule.** The control ink belongs to the conversation-to-
signed-work path and to focus. It may never be spent on branding, decoration,
hover wash, or a call to action that is not on that path.

**The Terrain Is Ground Rule.** Terrain inks are grounds behind content. They
never carry text weight, and they never compete with the course.

**The Trust Color Rule.** Gold and signature meta mark accountability. Do not
invent presence dots or vanity metrics.

**The Legend Is Not A Sentence Rule.** When a reader needs to learn what
something means, extend the legend. Do not add an explanatory string to the
interface.

## 3. Typography

**Display / Body:** Helvetica Neue, then Segoe UI / `ui-sans-serif` / system-ui.
**Meta / Mono:** `ui-monospace` stack for anchors, signatures, repo paths only.

Typography is operational and sleek: slightly tighter than marketing sites, stronger author weight (X), readable body (Bluesky), no decorative display fonts. Inter is banned — it is the default AI/SaaS face and fights the civic-workshop voice.

### Hierarchy

- **Display** (750, 2.25rem): Rare — marketing or empty-state only, not the app shell header.
- **Headline** (700, 1.3125rem): Shell titles (repo name area), channel origin marker.
- **Title** (700, 1.0625rem): Message author, object subject lines, active channel name.
- **Body** (400, 0.9375rem, 1.5): Message content; max ~70ch.
- **Label** (650, 0.8125rem): Buttons, eyebrows, counts.
- **Meta** (500, 0.72rem mono): `anchor:…`, `sig:…`, paths.

### Named rules

**The Product Type Rule.** No Fraunces, Inter, Inter Display, or marketing fonts in Community UI. Helvetica Neue + platform UI sans only.

**The Notation Rule.** Mono is notation, not decoration: anchors, signatures, repository paths, control numbers and measured values. Prose never sets in mono, and notation never sets in the body face.

**The Author First Rule.** Display name is the strongest text in a message row; role and time are muted; mono trust line is quietest. A conversational message has no subject line above it — only messages about an object (promoted intent, agent run, issue) carry a Title.

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
- **Do** keep the light paper rail + raised feed split (same medium as the map).
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
