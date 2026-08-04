---
name: Relay
description: The messaging workspace — repository-scoped channels where any message can become work; selecting a message opens the signed action tray, and "Promote to intent" turns conversation into a co-credited change proposal without leaving the thread.
colors:
  bg: "#f4f5f7"
  panel: "#ffffff"
  line: "#e4e6ea"
  ink: "#191b1f"
  muted: "#697180"
  indigo: "#4f46e5"
  indigo-soft: "#eef0fe"
  green: "#0f9d58"
  amber: "#b45309"
typography:
  display:
    fontFamily: "-apple-system, Segoe UI, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  body:
    fontFamily: "-apple-system, Segoe UI, Inter, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, Segoe UI, Inter, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    letterSpacing: "0.08em"
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "11.5px"
    note: "anchors and file paths only"
rounded: { sm: "8px", md: "10px", lg: "12px" }
spacing: { xs: "6px", sm: "10px", md: "14px", lg: "20px" }
components:
  signed-action-tray:
    note: "Appears under a selected message: Promote to intent (primary), Anchor to file, Capture as docs, Mark as answer, Ask an agent. Keyboard shortcuts on every action; footnote states actions are signed and stay linked to the message forever."
  intent-draft-panel:
    note: "Right panel materializes the intent from the selected message: prefilled title, source-message quote chip that stays linked, co-credit line, anchor, reviewers, policy, epoch target, and one primary File button naming the signer."
  channel-rail:
    note: "Channels + Work (Intents, Epoch N, Workspaces) + presence with roles; agents get a dashed presence dot."
  anchor-chip:
    note: "Inline chip on a message: ⚓ anchored to file · line — the conversation attached to the work."
---

# Design System: Relay

## Philosophy
**"The conversation is the changelog."** Relay is the flagship surface for
G1: messaging is not beside the project, it is how the project moves. A
community talks in channels the way it already wants to (Discord/Slack
muscle memory), but every message carries latent work: select it and the
signed action tray offers the five verbs that turn talk into product —
promote, anchor, capture, answer, delegate. The hero flow shown: lena (a
citizen builder) proposes offline listening in plain words; june promotes
the message; the intent draft materializes beside the thread with lena
co-credited, the anchor attached, reviewers and epoch target set. The
side panel's closing line is the thesis: three ideas became intents this
month — the channel is working.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Crisp light workspace: paper-gray canvas, white panels, hairline borders,
one electric indigo reserved for selection and primary action; amber is
the epoch color everywhere in round 3; green only for verified/passing.
Compact grotesque type at 13.5px, 8–12px radii, keyboard hints on tray
buttons — the fast, unfussy register of Linear/Slack-class tools.

## Ideation
Three structures were sketched: tray-as-context-menu (hidden — rejected:
the product's core verbs must be visible to be learned), a separate
"triage" screen for promotion (rejected: leaving the thread breaks G1),
and the three-pane thread + draft (chosen: cause and effect visible in
one glance — message left, intent right, forever linked).

## Distinctness Check
Relay owns the messaging surface and the promote-to-intent hero. Pocket
reuses its system deliberately at mobile scale (a system proof, not a
duplicate); Review shows the intent after this flow; Atrium shows the
project around it. No other candidate is three-pane, indigo-accented, or
message-centric.
