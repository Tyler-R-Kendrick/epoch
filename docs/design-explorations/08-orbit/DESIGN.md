---
name: Orbit
description: Explore as belonging — communities presented with the numbers that predict a good home (first-reply time, first-timers welcomed, epochs shipped) and open calls matched to who you are, code optional.
colors:
  bg: "#ffffff"
  ink: "#101014"
  muted: "#5d6470"
  line: "#e9ebee"
  violet: "#7c3aed"
  blue: "#2563eb"
  emerald: "#059669"
typography:
  display: { fontFamily: "Avenir Next, Segoe UI, sans-serif", fontSize: "38px", fontWeight: 800, letterSpacing: "-1px" }
  body: { fontFamily: "Avenir Next, Segoe UI, sans-serif", fontSize: "14px", lineHeight: 1.5 }
  label: { fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em" }
rounded: { md: "16px", lg: "18px", pill: "999px" }
spacing: { md: "18px", lg: "44px" }
components:
  community-card:
    note: "Aurora-wash cover, mark, one-line purpose, and the belonging stats: members, epochs shipped, median first reply; open-call chips (many no-code); join + welcome proof."
  open-calls-matched:
    note: "Right rail: calls matched to your follows and skills, each with a because-line and 'Raise your hand'."
  topic-chips:
    note: "Human topics (sea & weather, fiber arts), not language tags."
  portability-note:
    note: "'Joining costs nothing and locks nothing' — identity, graph, and credit travel with you."
---

# Design System: Orbit

## Philosophy
**"Discovery should rank homes, not popularity."** Orbit replaces
trending-repo leaderboards with the question a newcomer actually has:
where will I be welcome? Cards lead with belonging signals — median
first reply, first-timers credited this epoch, epochs shipped — and
open calls are explicit, mostly no-code, and mentored. The matcher's
because-lines ('because you follow lena', 'because you sail') make the
recommendation legible instead of algorithmic-creepy. A brand-new
community (four members, first epoch forming) gets the same dignity as
the big one: 'be an early neighbor.'

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Vibrant discovery grid: white ground, aurora radial washes per card
cover (each community its own hue), geometric semibold type, chip
taxonomy, generous 18px radii. The most colorful candidate, kept
tasteful by confining color to covers and chips.

## Ideation
Rejected: trending charts (popularity ≠ welcome) and tag-search-first
(assumes you know what to ask for). Chosen: browse-by-belonging with
matched calls — the interface itself argues G5's promise that everyone
builds.

## Distinctness Check
Owns discovery and the aurora-multi-hue language. Atrium is one
community's home; Orbit is the street of front doors; Record is what
you carry between them.
