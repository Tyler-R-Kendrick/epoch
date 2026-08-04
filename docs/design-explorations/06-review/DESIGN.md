---
name: Review
description: Intent review as a conversation-native act — the change with its anchored discussion woven inline, the origin message one chip away, policy legible, and approval a signing ceremony with your name on it.
colors:
  bg: "#eef1f5"
  panel: "#ffffff"
  line: "#dde2e9"
  ink: "#141a22"
  muted: "#5b6675"
  cobalt: "#2563eb"
  cobalt-soft: "#e8effd"
  green: "#0f9d58"
  amber: "#b45309"
typography:
  headline: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "19px", fontWeight: 800 }
  body: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "13.5px", lineHeight: 1.55 }
  code: { fontFamily: "ui-monospace, SF Mono, Menlo, monospace", fontSize: "12px", lineHeight: 1.75 }
  label: { fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em" }
rounded: { sm: "6px", md: "12px" }
spacing: { sm: "10px", md: "16px", lg: "20px" }
components:
  origin-chip:
    note: "⚓ born in #ideas · quoted first words · view thread — every intent knows its conversation."
  anchored-thread:
    note: "Discussion pinned to the exact line, inline with the change, with resolution state and 'the fix is part of this intent'."
  approve-and-sign:
    note: "The primary action names the signer and states the permanence and the epoch credit; the alternative is 'Request changes — kindly, with a note'."
  how-it-got-here:
    note: "A humane timeline: proposed → promoted → field-tested → agent changelog (reviewed) → first sign → lands in Epoch N."
---

# Design System: Review

## Philosophy
**"Review is where trust is manufactured — the interface should show its
supply chain."** Review renders an intent as a story with evidence (G2,
G3): the origin chip links back to lena's message; nadia's storage
concern is anchored to line 84, answered, and resolved *inside* the
change; policy is stated in product words (2 reviews · humans only ·
deterministic merge · one-click rollback); and approval is a signing
ceremony — 'Approve & sign as nadia', recorded permanently, credited on
Epoch 13. Requesting changes is designed to be kind by default. Code
appears exactly where code belongs, and nowhere else.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Precision light workspace: cool gray canvas, white file cards, cobalt
for review actions and anchors, 6px radii, dense-but-calm two-pane
layout. Mono strictly for filenames and code lines.

## Ideation
Rejected: diff-first with comments in a separate tab (GitHub's original
sin — severs conversation from change) and chat-first review (loses the
change's shape). Chosen: change-with-woven-thread plus a status rail —
evidence and decision in one eyeful.

## Distinctness Check
Owns the review surface and the cool-gray/cobalt precision register.
Relay is where the intent is born; Assembly is where it lands; Pocket
compresses this exact approval to a phone.
