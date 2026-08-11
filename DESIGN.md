---
version: alpha
name: Epoch Nightboard
description: Tron-inspired terminal community board — keyboard-first TUI chrome, Grid theme, signed conversation becoming work.
colors:
  primary: "#03050a"
  secondary: "#7a8896"
  tertiary: "#ff2cf0"
  neutral: "#03050a"
  surface: "#070b12"
  surface-raised: "#0c121c"
  surface-sunken: "#020408"
  ink: "#c8d0d8"
  ink-soft: "#a0aab4"
  ink-faint: "#7a8896"
  muted: "#7a8896"
  line: "#1a2836"
  line-strong: "#2a3c50"
  accent: "#ff2cf0"
  accent-strong: "#ff66f5"
  accent-ink: "#000000"
  agent: "#40f0ff"
  signed: "#f0e050"
  live: "#3dff6a"
  warn: "#ffaa00"
  danger: "#ff3355"
  control: "#ff2cf0"
  gold: "#f0e050"
  teal: "#40f0ff"
  teal-deep: "#1a90a0"
  rail: "#070b12"
  rail-text: "#c8d0d8"
  rail-muted: "#7a8896"
  rail-hover: "#0c121c"
  rail-active: "#0c121c"
  rail-line: "#1a2836"
  success: "#3dff6a"
  warning-bg: "#1a1400"
  warning-ink: "#ffaa00"
  warning-line: "#ffaa00"
  avatar: "#0c121c"
  avatar-ink: "#c8d0d8"
  # Compatibility aliases for non-canonical package renderers and sibling apps.
  # Do not use these in Nightboard UI; prefer accent / agent / signed / live / warn / danger.
  runnable: "#0c121c"
  rough: "#1a2836"
  rough-strong: "#2a3c50"
  open-land: "#f0e050"
  open-land-strong: "#f0e050"
  marsh: "#40f0ff"
  marsh-strong: "#1a90a0"
  mint: "#3dff6a"
  mint-strong: "#3dff6a"
  out-of-bounds: "#ff3355"
typography:
  display:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  headline:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0em"
  title:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0em"
  body:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.04em"
  meta:
    fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0em"
rounded:
  none: "0px"
  xs: "0px"
  sm: "0px"
  md: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  button-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  button-intent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  channel-button:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  channel-button-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.accent}"
  input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  focus-ring:
    backgroundColor: "{colors.agent}"
---

# Epoch Nightboard Design

Living reference implementation: [`docs/design-explorations/nightboard/`](docs/design-explorations/nightboard/).
Authority: [ADR-0027](docs/design-decisions/0027-community-visual-world-nightboard.md).
Course Line archive: [`docs/design-explorations/redesign-2026/DESIGN-course-line-archived.md`](docs/design-explorations/redesign-2026/DESIGN-course-line-archived.md).

## Overview

Epoch Community’s product UI is a **keyboard-first terminal board**: the whole
page is the TUI. Identity is Tron Grid on near-black — magenta chrome, cyan
agents, gold signed marks, CRT scan — not Slack paper, not ISOM terrain, not
generic dark SaaS.

The hangout is still the product (conversation → signed work). The form is the
one developers already operate fluently: reverse-video selection, `[bracket]`
controls, numbered exits, j/k motion, and a status line that always shows how
to get help.

## Colors

| Token | Role |
|---|---|
| `primary` / `neutral` / page `bg` | Near-black void (`#03050a`) |
| `surface` / `rail` | Panel one step up |
| `ink` → `ink-faint` | Text weights |
| `accent` / `control` | Magenta chrome — selection, primary commit, course |
| `agent` / `teal` | Cyan — agents, focus glow, Tron grid |
| `signed` / `gold` | Verification marks only |
| `live` / `success` | Live / healthy |
| `warn` / `danger` | Caution / moderation |

### Named rules

**The Grid Rule.** Grid is the only shipped theme. No palette dropdown theater.

**The Signal Rule.** Magenta is chrome and the promote path. Cyan is agents and
focus energy. Gold is signed/verified only. Do not spend gold on decoration.

**The No Pill Rule.** Radius is zero. Controls read as TTY cells, not bubbles.

**The Glow Budget.** Soft cyan text-shadow / grid glow is atmosphere; it must
never replace contrast. AA contrast still gates.

## Typography

**One face:** `ui-monospace` stack everywhere. Display is FIGlet / ASCII art in
the masthead, not a marketing serif. No Inter. No Helvetica Neue as product UI.

### Named rules

**The Terminal Type Rule.** Prose, chrome, and notation share the mono stack;
weight and brightness carry hierarchy, not font family swaps.

**The Bracket Rule.** Interactive chrome that is not a filled primary button
wears `[label]` TTY brackets (sort chips, masthead actions, filters).

## Layout

- **Whole page is the TUI** — workspace tabs, blades, prompt foot; no side
  terminal panel.
- **Regions** (Nightboard contract): masthead, rail, stream, notice, detail,
  composer, status.
- **Density:** character-grid rhythm (`--nb-cell`); hairline rules; reverse
  video for selection.
- **Composer / CLI** sticky in the foot; status line always exposes key help.

### Named rules

**The Page Is The Terminal Rule.** Do not add a dockable terminal; blades fill
the TUI.

**The Keyboard First Rule.** Every primary path has a key. Mouse is optional
parity, not the design center.

**The Queue Rule.** Live arrivals never steal the reading position; they wait
behind an explicit load (`R`).

## Elevation & Depth

Flat panels on void. Depth comes from scanline / grid-road atmosphere and
selection invert, not card shadows. No glassmorphism.

## Shapes

All radii `0`. Square avatars / leads. No pills, no bubbles, no soft cards.

## Components

- **Masthead:** Epoch FIGlet wordmark + Tron grid-road canvas + Activity +
  identity. No brand plaque tagline.
- **Workspace tabs:** TTY tab strip; selected = reverse video / accent edge.
- **Rows / posts:** Flat feed rows; actor weight first; quiet mono trust line.
- **Actions:** Rectangular / bracketed; primary filled magenta; agent accents
  cyan.
- **Status:** Persistent `[keys]` cue; live/snapshot honesty in the board’s own
  voice.

## Do's and Don'ts

### Do

- **Do** treat `docs/design-explorations/nightboard/` as the highest-fidelity
  reference until Community Web reaches parity.
- **Do** keep hotkeys documented in the status line and `?` help.
- **Do** preserve AA contrast under glow/scan.
- **Do** show live vs snapshot honesty without marketing banners.

### Don't

- **Don't** regress to Course Line paper/terrain as the default product look.
- **Don't** ship Inter, pill clusters, glass stacks, or purple-blue SaaS
  gradients.
- **Don't** invent vanity presence metrics or fake online dots.
- **Don't** hide keyboard paths behind icon-only chrome.
