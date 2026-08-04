---
name: Atrium
description: The project home — story, live activity, channels, people, and the epochs strip in one warm page; the repository page reinvented as a community's front door, with "join" replacing "fork".
colors:
  bg: "#faf9f7"
  panel: "#ffffff"
  line: "#eae7e1"
  ink: "#1c1917"
  muted: "#6f6a63"
  emerald: "#047857"
  emerald-soft: "#e8f5ef"
  amber: "#b45309"
typography:
  display: { fontFamily: "Seravek, Segoe UI, sans-serif", fontSize: "26px", fontWeight: 800 }
  headline: { fontFamily: "Seravek, Segoe UI, sans-serif", fontSize: "17px", fontWeight: 800 }
  body: { fontFamily: "Seravek, Segoe UI, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.55 }
  label: { fontFamily: "Seravek, Segoe UI, sans-serif", fontSize: "13px", fontWeight: 800, letterSpacing: "0.05em" }
rounded: { md: "14px", lg: "16px" }
spacing: { sm: "10px", md: "18px", lg: "26px" }
components:
  epoch-hero:
    note: "The page lead is never a file listing: a progress ring for the assembling epoch, its name, what's going in, ship time, and plaque count."
  activity-feed:
    note: "Mixed feed of human moments: intents filed/merged (as object chips with state), quotes from channels, answers captured to docs, agent items labeled and review-gated."
  epochs-strip:
    note: "Past epochs as named, dated, credited cards; the assembling one carries a progress bar."
  building-this-week:
    note: "Avatar cluster incl. dashed-ring agent with the supervision sentence spelled out."
---

# Design System: Atrium

## Philosophy
**"A project's front door should introduce its people before its file
tree."** Atrium reinvents the repository page as a community home (G5,
G4). Identity row: what the project is, who vouches for it, one JOIN
action ("no fork required — your work stays credited to you"). The lead
story is always the epoch being assembled — a progress ring, its name,
its ship time — because a community's time is structured by epochs, not
by commit noise. Below, activity renders as human moments with object
chips (intent #518 · in review), never as log lines; the right column
holds channels with honest states ("3 waiting — help!"), community
health facts, and the builders of the week with the agent's supervision
sentence written out.

All ten round-3 candidates are screens of the same product,
Epoch.Community.Web (to Epoch what GitHub is to Git). Every candidate
must show Epoch primitives — intents, anchors, epochs, verified
identity, supervised agents, workspaces — as legible product concepts
with humane microcopy, and must serve the foundation goals G1–G5.

## Design System & Look
Warm editorial SaaS: porcelain ground, soft 16px-radius cards with
gentle shadows, humanist sans, emerald as the project's own color,
amber reserved for epoch state. Density is magazine-calm; numbers are
few and human (first reply 41 min, 11 first-timers).

## Ideation
Rejected: README-first (tells newcomers nothing about the people) and
dashboard-first (metrics wall violates the product's warmth). Chosen:
story-first with the epoch as lead — the one page that answers "what is
this, who's here, what's shipping, how do I belong" in a single screen.

## Distinctness Check
Atrium owns the project-home surface and the porcelain/emerald language.
Assembly zooms into its epoch hero; Relay zooms into its channels;
Orbit is the many-projects view of its one-project card.
