# Design Explorations Foundation — Epoch.Community.Web

Ten design candidates for **Epoch.Community.Web**, the community experience
built on the Epoch DVCS. The relationship is the brief:
**Epoch.Community.Web is to Epoch what GitHub is to Git.**

## What is being designed

Epoch is the signed, event-driven successor to Git. This exploration
designs the website on top of it — the product that does for Epoch what
GitHub did for Git, and then goes where GitHub never did: it is the
community's home, not just the code's. Developers today scatter their
collaboration across Discord/Slack (chat), X (announcements), Stack
Overflow (questions), and Reddit (long-form) because GitHub suits none of
those interactions. Epoch.Community.Web collapses that scatter into one
product where **conversation, contribution, and shipping share a single
context**, for developers, citizen builders building in the open, and
agents committing concurrently under human oversight.

Epoch is the link. Its native primitives appear throughout the interface
as proud, legible product concepts — the way Git's branches and merges
became GitHub's branches and pull requests:

- **Intent** — a signed, lightweight change proposal (the PR successor).
- **Anchor** — a message or comment pinned to a file, line, or artifact,
  so conversation attaches to the work itself.
- **Epoch** — a point-in-time materialization of the project, credited to
  everyone who took part; the release as community milestone.
- **Verified identity** — cryptographic authorship rendered humanely
  (verified marks, permanent credit), never as raw hashes.
- **Agent participants** — named, policy-bound, supervised, pausable.
- **Workspaces** — no-setup sandboxes where anyone can build safely.

Sample projects in the mockups (paper-radio, tide-tables, knot…) are
placeholders and swappable; Epoch and its primitives are not.

## Personas and problem themes

Personas follow `docs/persona-feature-matrix.md`: the maintainer-host, the
developer contributor, the citizen builder, the community member, and the
supervised agent participant (designed for the humans around it).

Problem themes: **scatter** (five apps that don't know about the work),
**invisible work-in-progress**, **contribution overwhelm**, **gatekept
participation**, and **unmarked milestones**.

## Design goals every candidate must serve

- **G1 · Conversation is a working surface.** Any message can carry work:
  anchor it to a file, promote it to an intent, capture it as docs, mark
  it as the answer. Messaging is not beside the project; it is how the
  project moves.
- **G2 · Epoch primitives as product concepts.** Intents, anchors,
  epochs, verified identity, and agents are named and visible with humane
  microcopy — celebrated, not hidden and not rendered as hex.
- **G3 · Build together, live.** Presence, shared workspaces, and
  human+agent concurrency are first-class interactions, not logs.
- **G4 · Epochs are the heartbeat.** Assembling, shipping, and
  celebrating an epoch structures community time and credit.
- **G5 · One home.** Follow, discuss, ask, decide, build, and ship
  without leaving the product.

## Round-3 method note

Rounds 1–2 failed in opposite directions: first by dressing the substrate
in instrument cosplay, then by hiding the product behind physical-world
metaphors (gardens, post offices). Round 3 designs **real product UI**:
every candidate is a screen of the same application, differentiated the
way award-winning products differentiate — by design language (type,
color, density, shape, motion) and by which core interaction it makes the
hero — not by theme-park metaphor.

## Distinctness Ledger

Candidate specs: [1 Relay](01-relay/DESIGN.md) ·
[2 Atrium](02-atrium/DESIGN.md) ·
[3 Pulse](03-pulse/DESIGN.md) ·
[4 Answers](04-answers/DESIGN.md) ·
[5 Assembly](05-assembly/DESIGN.md) ·
[6 Review](06-review/DESIGN.md) ·
[7 Studio](07-studio/DESIGN.md) ·
[8 Orbit](08-orbit/DESIGN.md) ·
[9 Record](09-record/DESIGN.md) ·
[10 Pocket](10-pocket/DESIGN.md)

| # | Candidate | Hero surface & interaction | Design language | Palette | Type & shape |
|---|-----------|----------------------------|-----------------|---------|--------------|
| 1 | Relay | Channels & messages; select a message → signed action tray → **promote to intent** | Crisp light workspace, three-pane, keyboard-fast | Paper gray, white panels, electric indigo | Compact grotesque, 8–10px radii, hairline borders |
| 2 | Atrium | Project home: story, live activity, channels, epochs strip in one page | Warm editorial SaaS, soft depth | Porcelain, ink, emerald | Humanist sans, 16px radii, gentle shadows |
| 3 | Pulse | Building-in-the-open feed; posts embed live intent/epoch cards | High-contrast social stream | White, near-black, coral | Large-type posts, divider rows, round avatars |
| 4 | Answers | Question → accepted answer → **captured into docs as an intent** | Calm reading product | Cream, deep teal | Serif display + sans body, wide measure |
| 5 | Assembly | The epoch page: assembling, countdown, credits, ship | Cinematic dark editorial | Charcoal, amber | Huge numerals, thin rules, generous space |
| 6 | Review | Intent review: anchored conversation woven into the change; **approve & sign** | Precision light workspace | Cool gray, white, cobalt | Dense-calm panes, mono for code only, 6px radii |
| 7 | Studio | Live co-build session: presence, tasks, checks, human+agent cursors → bundle into intents | Multiplayer canvas | Warm neutral, per-person hues, dashed agent gray | Rounded 12px, dotted canvas, chips |
| 8 | Orbit | Explore: communities, topics, open calls matched to you | Vibrant discovery grid | White with aurora washes | Geometric semibold, 14px radii, chip taxonomy |
| 9 | Record | Profile: the portable, verified contribution record | Luxe minimal document | Ivory, burgundy | Large serif identity, tabular rows, hairlines |
| 10 | Pocket | The same system in your pocket: feed, thread + action sheet, approve & ship | Mobile triptych of the Relay system | Indigo system on device frames | iOS-density cards, bottom sheets, large titles |

Rule: all ten depict the same product with the same primitives; no two
share a hero interaction or a design language. Every screen must show at
least two Epoch primitives doing real work, with copy a newcomer can read.

## Final Distinctness Audit (post-hardening)

Screenshot review of all ten hardened mockups confirms the rules held.

Every candidate is product UI of the same application — no physical-
world cosplay — and each hero interaction appears exactly once:
message→intent promotion (Relay, and as a mobile sheet in Pocket),
project home (Atrium), open-build feed (Pulse), answer→docs capture
(Answers), epoch assembly and shipping (Assembly), anchored review and
signing (Review), live human+agent co-building (Studio), discovery by
belonging (Orbit), and the portable contribution record (Record).

Design languages do not repeat: paper-gray/indigo workspace,
porcelain/emerald editorial, white/coral social stream, cream/teal
reading, charcoal/amber cinematic (the only dark screen), cool-gray/
cobalt precision, dotted-canvas multiplayer with per-person hues,
white/aurora discovery, ivory/burgundy document, and the mobile
triptych that intentionally re-uses Relay's tokens as a system proof.

Epoch primitives appear as named product concepts on every screen —
intents with review state, anchors linking talk to files, epochs with
plaques and countdowns, verified identity in humane words, supervised
agents that are always labeled and pausable, and workspaces — while
one shared cast (paper-radio and its people) threads the ten screens
into a single continuous story: lena's message in Relay becomes intent
#518 in Review, lands in Assembly's Epoch 13, ships in Pulse's feed,
and ends as permanent credit in Record.
