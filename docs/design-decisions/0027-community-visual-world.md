# ADR-0027: The Community Visual World Is Community Web

**Status:** Accepted
**Date:** 2026-08-05
**Supersedes:** [ADR-0026](0026-community-visual-world-course-line.md) (Course Line)
**Amends:** [ADR-0024](0024-community-theming-deferral.md) — product UI may be dark when the committed world is Community Web
**Related:** `PRODUCT.md`, root `DESIGN.md`, `packages/Epoch.Community.Web/app/`

## Context

Course Line (ADR-0026) shipped as a light civic-workshop / ISOM legend world for
Community Web. The product owner then judged the Community Web exploration — a
Tron-inspired terminal board with keyboard-first operation — **far superior**,
and directed that Impeccable use Community Web as the design source of truth and
iterate on it.

Community Web already exists as a living exploration:
`packages/Epoch.Community.Web/app/` (Grid theme, TUI chrome, hotkeys, Tron
grid-road). Course Line remains archived at
`docs/design-explorations/redesign-2026/DESIGN-course-line-archived.md`.

ADR-0024 deferred dark mode to avoid “dark terminal cosplay.” Community Web is not
cosplay: it is an intentional Operate-mode TUI for a developer community that
already reads terminal chrome fluently. The owner’s direction reopens product
darkness for this world only.

## Decision

1. **The committed Community visual world is Community Web (Grid).** Root
   `DESIGN.md` tokens and rules are derived from Community Web’s Grid theme and
   contract (`CONTRACT.md`, `themes.js`, `base.css`, console TUI).
2. **Keyboard-first is part of the design system**, not a Community Web-only demo:
   numbered exits, j/k navigation, reverse-video selection, bracketed TTY
   controls, and a persistent status/keys cue are normative for the product UI.
3. **Community Web is the canonical Community Web runtime.** The static deployment,
   local development command, accessibility gate, and browser journey all serve
   `packages/Epoch.Community.Web/app`; the former rendered shell has no local
   or production entrypoint.
4. **Impeccable targets the shipped Community Web files** for critique, audit,
   polish, and live iteration. There is no separate parity target.
5. **ADR-0024’s light-only lock is amended:** Community Web product surfaces may
   declare a dark `color-scheme` matching Grid. Pure-black fatigue and
   decorative neon spam remain banned; Grid’s near-black + cyan/magenta signal
   language is the approved exception.

## Consequences

- Agents must not reintroduce Course Line paper/terrain as the default product
  look when changing Community visuals.
- The app lives at `packages/Epoch.Community.Web/app` and is built, served, and
  deployed from that package. It was explored under the codename "Nightboard"
  and under `docs/design-explorations/`; that name is retired and the
  exploration is not a second or preview UI.
- `/` is the CanvasUI creator landing and `/board.html` is the tmux-style
  keyboard collaboration surface locally and in Vercel output.

## Revisit

- If the static Community Web source moves into a package without creating a
  second UI implementation.
- If the owner selects a different exploration as the product world.
