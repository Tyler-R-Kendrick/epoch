# Ten directions — 2026 redesign

Ten candidate replacement design worlds for Epoch.Community.Web, built to be
compared side by side. Open `index.html` (any static server) and switch with the
picker, the number keys `1`–`0`, or the arrow keys; `1440 / 840 / 390` reframes
the stage without reloading.

Each direction is a **different information architecture**, not a palette swap:
what leads, what navigates, and what the conversation-becomes-work path looks
like all change.

| # | Direction | Material family | What it argues |
|---|---|---|---|
| 1 | Plate Archive | scientific archive | The register leads; every message is an annotated, initialled, cross-referenced plate |
| 2 | Course Line | notation & diagram systems | A permanent legend where every ink means one thing, and one reserved purple traces the leg from talk to signed work |
| 3 | Ship's Log | manuscript & ledger | Time-ordered ruled entries with a permanent signature column; work is countersigned in the margin |
| 4 | Colophon | print & publishing | The community as a publication and the epoch as its edition; contributors set into the masthead |
| 5 | Guild Register | civic & administrative | The roll leads, not the channel list; agents sit on the same roll under a named supervisor |
| 6 | Job Board | workshop & physical | A shop wall read from the door; work moves through physical columns |
| 7 | Grid Program | graphic identity program | One strict modular grid, no boxes, no chrome; density costs nothing |
| 8 | Almanac | publication & agrarian | A yearly edition written for non-specialists, naming who grew each entry |
| 9 | Signal Bench | instrument (challenger) | Channels overlay in one graticule; the maintainer's density surface |
| 10 | Community Web | medium-native (challenger) | A character grid with numbered exits; presence scarce enough to be an event |

## Method

Directions were derived through `impeccable`'s new-work flow. The category rut —
the three-column chat app and its predictable opposite, the repo dashboard — was
named and excluded, as was the literal reading of the product's own name
(clocks, timelines, eras). Seven grounded directions were derived from open
source community life across at least three material families, then
`concept-seed.mjs --scope direction --mode operate` assigned index 4 of that
grounded list — **Plate Archive** — so the roll, not the model's ranking rut,
decides what leads. The table below is presentation order for review and is not
that list; Plate Archive is shown first because it is the assigned direction.
Course Line was briefly adopted ([ADR-0026](../../design-decisions/0026-community-visual-world-course-line.md))
and then superseded: the committed Community visual world is **Community Web**
([ADR-0027](../../design-decisions/0027-community-visual-world.md)).
Directions 9 and 10 are fused from dealt catalog challengers: they keep the
challenger's system grammar and take every fact from the product.

## Constraints these obey

From `PRODUCT.md`: users ranked citizen builder, maintainer, community member,
served by one interface. Nothing here implies adoption, activity volume or
social proof — the product has no real users, no analytics and no production
deployment, and every person and conversation is a fixture in `data.js`.

Agent participation always shows its supervisor and its review requirement.
State is legible without being narrated.

## Files

- `index.html` — shell, picker, viewport reframing
- `data.js` — the one fictional community shared by all ten
- `designs-a.js` — directions 1–5
- `designs-b.js` — directions 6–10

`docs/design-explorations/**` is in impeccable's detector ignore list: these
directions deliberately propose palettes outside the incumbent `DESIGN.md`,
which is the point of a replacement world and not drift.
