# ADR-0057: Community Channel Nav Badges Show Active Presence

**Status:** Accepted
**Date:** 2026-08-21
**Supersedes:** None
**Related:** [ADR-0025](0025-community-unread-model.md), [ADR-0012](0012-community-human-centered-design.md), root `DESIGN.md`

## Context

The channel nav badge in the Community Web board previously carried an unread
count ("N new") derived from the local watermark model of ADR-0025. In practice
the badge answered a question members were not asking — the sample board has no
real receipt flow to make unread meaningful — while the question maintainers
and contributors actually ask of a room list is "who is here right now?".
Discord and Slack power users orient by presence; a maintainer deciding where
to spend review attention reads activity, not an unread watermark.

Presence is easy to fake. The dishonest implementations were all within reach:

- Fixture subscriber totals (`channel.count` on each room) are static declared
  numbers. Presenting them as live presence would invent activity, which
  DESIGN.md and the `honesty` scorecard dimension forbid.
- A full board re-render on every presence event would repaint the entire nav
  for a one-digit change, wasting the craft budget on churn.

## Decision

1. **Badge semantics change from unread to active.** The counter badge on each
   channel/room nav row now shows the number of members active in that room —
   presence state here/active/working — instead of an unread-posts count.
2. **Presence comes only from declared member states and live events.** The
   initial picture is each member's declared presence state; live updates
   arrive as Core `channel.presence` events ingested through
   `CW_APP.ingestPresence` and the store-event path. Fixture subscriber
   `channel.count` fields are deliberately **not** presented as presence —
   they describe subscription, not who is in the room.
3. **Stale agents rank honestly.** Agent presence passes through
   `honestAgentStatus`, so an agent whose "working" state has gone stale ranks
   as idle rather than active.
4. **Rosters sort online-first.** The members rolls (`/members` and
   `/projects/<id>/members`) order here/active/working first, then idle, then
   away, stable within a rank.
5. **Badge updates repaint targets, not trees.** `paintChannelBadges` patches
   the `[data-active-badge]` DOM nodes in place; a presence change never
   triggers a full board re-render.
6. **Voice rooms keep their own chrome.** A voice room already renders a live
   roster and gets no count badge, so presence is shown once, honestly, per
   surface.

## Consequences

- The nav badge is a truthful signal a maintainer can act on: every number it
  shows traces to a declared member state or a real `channel.presence` event.
- Unread as a local watermark (ADR-0025) remains the model for receipt-derived
  "new since I read" state; it simply no longer owns the nav badge.
- Targeted DOM repaints keep presence updates cheap enough to stay live
  without destabilizing the rest of the board.
- Subscriber counts stay available as fixture data but must never be rendered
  as who is active; a future realtime fabric may change what feeds presence,
  not this honesty rule.

## Revisit criteria

Revisit when the NATS fabric (ADR-0054) or another realtime transport makes
presence server-tracked end to end, when authenticated sessions can declare a
member's own state instead of inheriting a fixture, or when unread receipts
become real enough that the badge should carry both signals. Any such change
must preserve rule 2: a badge number is always traceable to a declared state
or a live event, never to a static count.
