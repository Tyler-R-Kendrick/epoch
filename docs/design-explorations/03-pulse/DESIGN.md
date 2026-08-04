---
name: Pulse
description: Building in the open as a first-class feed — posts that embed live intent and epoch cards, so following someone's work means watching real objects move, not just reading announcements about them.
colors:
  bg: "#ffffff"
  ink: "#0a0a0a"
  muted: "#57606a"
  line: "#eceef0"
  coral: "#f43f5e"
  indigo: "#4f46e5"
  amber: "#b45309"
typography:
  display: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "19px", fontWeight: 800 }
  post: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "15.5px", fontWeight: 400, lineHeight: 1.5 }
  label: { fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", fontSize: "11px", fontWeight: 700 }
rounded: { pill: "999px", card: "14px" }
spacing: { sm: "13px", md: "22px" }
components:
  build-post:
    note: "A post whose attachments are live product objects: intent cards with review state, epoch cards with progress, workspace invites. Cards update as the object moves — the feed can't go stale or lie."
  composer:
    note: "'What are you building today?' with attach chips: + intent, + epoch, + workspace, + anchor."
  agent-post:
    note: "Agent posts carry a persistent role chip (agent · supervised by @mira) and state that review happened."
  follow-note:
    note: "'Following is portable — your graph belongs to you, not to this server.'"
---

# Design System: Pulse

## Philosophy
**"Announcements shouldn't be screenshots of work — they should be the
work."** Pulse replaces the X-shaped hole in developer life (G1, G5): a
feed where posts embed live intent and epoch cards, so 'day 11 of the
tuner rebuild' arrives with the actual intent, its review state, and its
epoch target attached. Celebration is native: mira's post carries the
assembling epoch with its plaque count; lena's first-credit post carries
her art. The energy is social; the substance is product objects that
cannot drift from the truth because they are the truth.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
High-contrast social stream: pure white, near-black large-type posts,
coral for the single post action, pill navigation, divider rows instead
of card boxes for posts. Embedded object cards borrow the system-wide
state colors (indigo review, amber epoch, green verified).

## Ideation
Rejected: chronological firehose of everyone (noise — the thing this
product exists to end) and an algorithmic "for you" (violates trust
posture). Chosen: following-first with live-object embeds and a visible
"Everyone" tab — the graph is yours, and it's portable.

## Distinctness Check
Pulse owns the feed surface and the white/coral social register. It is
the only stream layout; the Allotment-style following job is done here
as product UI, not metaphor. Orbit is discovery of strangers; Pulse is
devotion to people you chose.
