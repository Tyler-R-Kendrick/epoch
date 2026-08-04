---
name: Studio
description: The live co-building session — presence-colored task board, checks running on every save, session chat with voice, an agent working alongside humans under visible rules, and a bundle action that turns the day into credited intent drafts.
colors:
  bg: "#f6f5f3"
  panel: "#ffffff"
  line: "#e6e3de"
  ink: "#22201c"
  mira: "#8b5cf6"
  june: "#2563eb"
  lena: "#f97316"
  tomo: "#8a8f98"
  green: "#16a34a"
typography:
  headline: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "15px", fontWeight: 700 }
  body: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "13.5px", lineHeight: 1.5 }
  label: { fontSize: "11.5px", fontWeight: 800, letterSpacing: "0.08em" }
rounded: { md: "12px", lg: "14px" }
spacing: { sm: "10px", md: "16px", lg: "18px" }
components:
  presence-ring:
    note: "Each participant owns a hue; their ring marks the card they're in. The agent is always dashed gray, labeled, and pausable by the host."
  live-card:
    note: "Task cards with owner chips and an 'editing now' badge in the editor's color; done cards show their check state and which intent draft they joined."
  session-checks:
    note: "Checks run on every save and read as reassurance, not gate: names in product words ('reads-aloud · plain words')."
  bundle-action:
    note: "'Bundle today's work → N intent drafts — everything stays credited to who did it.'"
---

# Design System: Studio

## Philosophy
**"Building together should feel like being in the same room, including
for the participant who isn't a person."** Studio is G3 made spatial: a
live session where presence is color, tasks carry their editor's ring,
lena sketches beside june's cache work, and tomo — dashed, labeled,
supervised — drafts changelogs *alongside, never over* human files. The
work product is Epoch-native: at day's end, one action bundles the
board into intent drafts with credit already correct. The unclaimed
card is a standing welcome: good first task, no code, ships in the
epoch.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Multiplayer canvas: warm neutral dotted ground, white cards, per-person
hues used only for presence (never decoration), rounded 12px, chat with
a voice-note pill. Figma's social warmth applied to shipping software.

## Ideation
Rejected: screen-share-first (spectators, not builders) and
editor-embedded presence only (excludes non-code contributors from the
room). Chosen: the shared board — code, art, and copy tasks are peers
on it, which is the whole point.

## Distinctness Check
Owns live concurrency and per-person color. The only dotted-canvas
language. Relay is async conversation; Studio is the synchronous hour;
its bundle hands off to Review.
