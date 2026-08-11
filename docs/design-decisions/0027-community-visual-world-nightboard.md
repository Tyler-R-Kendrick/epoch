# ADR-0027: The Community Visual World Is Nightboard

**Status:** Accepted
**Date:** 2026-08-05
**Supersedes:** [ADR-0026](0026-community-visual-world-course-line.md) (Course Line)
**Amends:** [ADR-0024](0024-community-theming-deferral.md) — product UI may be dark when the committed world is Nightboard
**Related:** `PRODUCT.md`, root `DESIGN.md`, `docs/design-explorations/nightboard/`

## Context

Course Line (ADR-0026) shipped as a light civic-workshop / ISOM legend world for
Community Web. The product owner then judged the Nightboard exploration — a
Tron-inspired terminal board with keyboard-first operation — **far superior**,
and directed that Impeccable use Nightboard as the design source of truth and
iterate on it.

Nightboard already exists as a living exploration:
`docs/design-explorations/nightboard/` (Grid theme, TUI chrome, hotkeys, Tron
grid-road). Course Line remains archived at
`docs/design-explorations/redesign-2026/DESIGN-course-line-archived.md`.

ADR-0024 deferred dark mode to avoid “dark terminal cosplay.” Nightboard is not
cosplay: it is an intentional Operate-mode TUI for a developer community that
already reads terminal chrome fluently. The owner’s direction reopens product
darkness for this world only.

## Decision

1. **The committed Community visual world is Nightboard (Grid).** Root
   `DESIGN.md` tokens and rules are derived from Nightboard’s Grid theme and
   contract (`CONTRACT.md`, `themes.js`, `base.css`, console TUI).
2. **Keyboard-first is part of the design system**, not a Nightboard-only demo:
   numbered exits, j/k navigation, reverse-video selection, bracketed TTY
   controls, and a persistent status/keys cue are normative for the product UI.
3. **Nightboard is the canonical Community Web runtime.** The static deployment,
   local development command, accessibility gate, and browser journey all serve
   `docs/design-explorations/nightboard`; the former rendered shell has no local
   or production entrypoint.
4. **Impeccable targets the shipped Nightboard files** for critique, audit,
   polish, and live iteration. There is no separate parity target.
5. **ADR-0024’s light-only lock is amended:** Nightboard product surfaces may
   declare a dark `color-scheme` matching Grid. Pure-black fatigue and
   decorative neon spam remain banned; Grid’s near-black + cyan/magenta signal
   language is the approved exception.

## Consequences

- Agents must not reintroduce Course Line paper/terrain as the default product
  look when changing Community visuals.
- The historical `design-explorations/nightboard` path is now the source tree
  for the shipped app; its name does not make it a second or preview UI.
- `/` is the CanvasUI creator landing and `/board.html` is the tmux-style
  keyboard collaboration surface locally and in Vercel output.

## Revisit

- If the static Nightboard source moves into a package without creating a
  second UI implementation.
- If the owner selects a different exploration as the product world.
