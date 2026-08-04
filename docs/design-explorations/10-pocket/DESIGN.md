---
name: Pocket
description: The same product in your pocket — a mobile triptych proving the system scales: the following feed with live epoch and intent cards, a channel with the signed-action sheet on a selected message, and a full intent approval finished on a phone.
colors:
  backdrop: "#191a1e"
  bg: "#f4f5f7"
  panel: "#ffffff"
  ink: "#191b1f"
  indigo: "#4f46e5"
  green: "#0f9d58"
  amber: "#b45309"
typography:
  largetitle: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "24px", fontWeight: 800 }
  body: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "12.5px", lineHeight: 1.5 }
  tab: { fontSize: "9.5px", fontWeight: 700 }
rounded: { card: "14px", sheet: "24px", device: "48px" }
spacing: { sm: "10px", md: "14px" }
components:
  action-sheet:
    note: "The signed action tray as a native bottom sheet: Promote to intent primary with co-credit subtitle, then anchor/docs/answer/agent; permanence note at the foot."
  live-cards:
    note: "Feed items embed intent/epoch state chips identical in meaning to desktop."
  approve-screen:
    note: "A real approval: facts list (reviews, resolved concern, field tests, merge guarantees), Approve & sign primary, 'slide to request changes, kindly', and the epoch-impact toast."
  tabbar:
    note: "Home · Channels · Intents · Epochs · Me — the five nouns of the product."
---

# Design System: Pocket

## Philosophy
**"If the community lives in your pocket, the work has to fit there
too."** Pocket is the system proof (G1–G5 at 390 points wide): the
Relay design system distilled to mobile without losing a single
primitive. Screen one: following, with the epoch banner asking for the
one thing only you can do ('your review is one of the last two').
Screen two: the signed action sheet on lena's message — the product's
five verbs as a thumb-reachable bottom sheet. Screen three: a complete,
honest approval — evidence summarized, Approve & sign, kind-by-default
alternative, and the toast that ties your tap to Friday's launch party.
GitHub's mobile app is a notifications viewer; this is the product.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
The Relay system at iOS density: large titles, cards, bottom sheets,
tab bar of the product's five nouns; indigo primary, amber epoch, green
verified. Presented as a triptych on a dark backdrop with captions —
evidence framing, not decoration.

## Ideation
Rejected: notifications-first mobile (the GitHub failure) and a
read-only companion (breaks G3). Chosen: three moments a member
actually completes on a phone — follow, turn talk into work, sign.

## Distinctness Check
The only mobile candidate; deliberately shares Relay's tokens to prove
the system, while its surfaces (feed card stack, bottom sheet, approval
screen) exist nowhere else in the set.
