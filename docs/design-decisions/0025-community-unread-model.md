# ADR-0025: Community Unread Is Receipt-Derived And Local

**Status:** Accepted
**Date:** 2026-08-03
**Supersedes:** None
**Related:** [ADR-0024](0024-community-theming-deferral.md), root `DESIGN.md`, `docs/community-web-content-design.md`

## Context

Moderators and channel-first members orient by unread state — it is the first
thing Discord and Slack power users look for, and the `community-moderator`
persona lives in that queue. Community Web had none, so every visit looked
identical whether or not anything had happened.

The obvious implementations are all dishonest or premature:

- Server-tracked read state needs per-member accounts and a write path Epoch
  Community does not have yet.
- Marking everything unread on a first visit manufactures urgency; DESIGN.md
  forbids inventing presence or activity, and the `honesty` scorecard
  dimension is the product's wedge.
- Timestamp-based unread would need conversation views to carry real
  timestamps. `CommunityConversationView` currently carries display strings
  ("live", "now", "09:05"), so any timestamp comparison would be fiction.

## Decision

Unread is a **local watermark over real receipts**:

1. The watermark is the number of messages a member had already seen in a
   `(community, channel)` pair, stored in `localStorage` under the
   `epoch-community:` namespace (`epoch-community:last-read`).
2. Unread count is `max(0, currentMessageCount - watermark)`, computed from
   the conversations actually loaded into client state — never from a server
   claim or an invented number.
3. **A channel with no watermark is not unread.** A first visit lights up
   nothing; a member must have read a channel before it can be "new" to them.
4. Opening a channel writes the watermark. Reading is the only thing that
   marks read.
5. Unread is never colour-only: the count renders as text inside the channel
   button and is carried in the button's accessible name ("# ideas, 3 unread")
   for members using a screen reader or forced colours.
6. Storage access is wrapped so an opaque origin or a privacy mode degrades to
   "no unread state" rather than breaking the rail.

## Consequences

- Honest and offline-first, consistent with ADR-0001: no server, no account,
  no network round trip, and nothing invented.
- Read state is per-browser. It does not follow a member across devices, and
  clearing site data resets it. This is stated plainly rather than hidden.
- Counting messages (rather than comparing timestamps) means a deletion can
  reduce the count; the `max(0, …)` clamp makes that read as "nothing new"
  instead of a negative badge.
- Server push notifications, per-message read receipts, and mention badges are
  explicitly **out of scope** — they need an identity and delivery story that
  does not exist yet.

## Revisit criteria

Move to timestamp-based unread when `CommunityConversationView` carries real
receipt timestamps end to end, and to synced read state when authenticated AT
sessions can store per-member preferences. Either change must preserve rules
3 and 5 above.
