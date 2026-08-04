---
name: Answers
description: Questions that end as documentation — the Q&A surface where an accepted answer can be captured into the project's docs as a signed, co-credited intent, and channel health is a public promise.
colors:
  bg: "#fbf8f1"
  panel: "#fffdf8"
  line: "#eae4d6"
  ink: "#211d16"
  teal: "#0f766e"
  teal-soft: "#e6f2f0"
  green: "#15803d"
typography:
  question: { fontFamily: "Georgia, serif", fontSize: "31px", fontWeight: 400, lineHeight: 1.25 }
  body: { fontFamily: "-apple-system, Segoe UI, Verdana, sans-serif", fontSize: "15px", lineHeight: 1.6 }
  label: { fontFamily: "-apple-system, Segoe UI, Verdana, sans-serif", fontSize: "12px", fontWeight: 800, letterSpacing: "0.07em" }
  mono: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: "12.5px", note: "settings excerpts only" }
rounded: { md: "12px", lg: "16px" }
spacing: { md: "18px", lg: "30px" }
components:
  accepted-answer:
    note: "Teal-bordered card with acceptance and helpfulness badges, answerer provenance (she built the shelf · verified), and the capture banner."
  captured-into-docs:
    note: "The killer banner: 'This answer became documentation' — captured into guides/… as intent #N, merged, credited to asker and answerer."
  channel-health:
    note: "Public promises as numbers: median first answer, zero unanswered >24h, answers captured, first-timers welcomed."
---

# Design System: Answers

## Philosophy
**"A good answer deserves a better fate than page 4 of a chat scroll."**
Answers rebuilds the Stack Overflow job inside the community (G5, G2,
G3): r. beck's ferry question is welcomed (first-time asker, greeted by
name), answered in 52 minutes by the person who built the feature, and
then the accepted answer is *captured into the docs* as a signed intent
— merged, credited to asker and answerer both. Questions never rot in
chat; knowledge compounds into the project. The right rail makes care
measurable and public: median first answer 41 minutes, nothing
unanswered past a day.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Calm reading product: cream ground, serif display for the question
(reading dignity), sans body at a wide measure, deep teal as the single
accent, votes quiet and secondary to acceptance. The one mono block is a
settings excerpt, styled as product copy, not terminal.

## Ideation
Rejected: threaded-chat Q&A (answers drown) and votes-first ranking
(popularity isn't correctness in small communities). Chosen:
acceptance-first with docs-capture as the celebrated outcome — the
surface optimizes for the knowledge ending up where the next person
looks.

## Distinctness Check
Answers owns the Q&A surface and the cream/teal reading register. Its
serif is editorial-functional, not luxe (that's Record). The capture
flow is the docs-side twin of Relay's promote flow.
