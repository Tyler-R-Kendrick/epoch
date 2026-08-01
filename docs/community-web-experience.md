# Community Web Experience

Community Web is a channel-first social workspace for Epoch projects. The first screen is not a dashboard or landing page: it opens directly into repository-scoped channels and a message feed.

The experience uses familiar community patterns without cloning Discord. Channels organize the conversation, messages feel lightweight, and Epoch-specific capabilities appear only in context: after a user selects a message, the inline action tray exposes signed anchors, signatures, linked artifacts, intent promotion, agent requests, docs-patch capture, accepted-answer capture, and moderation reporting.

## Feed source honesty

- **Live API with repository activity** (`apiBaseUrl` set and issues/changes present): the message feed is **API-primary**. Issues map into channels by label (`idea` → `#ideas`, `bug` → `#bugs`, default `#support`); change proposals appear in `#previews`. Hard-coded demos are **not** mixed in.
- **Snapshot / offline** (no API URL): the signed snapshot demo conversations render, each marked `snapshot sample`, with a banner that live actions are disabled.
- **Live but empty repository**: secondary honesty banner explains demos are labeled snapshot samples until activity arrives.

Intent promotion (**Mark intent**) is **fail-closed**: without a live API base URL it reports that promotion is disabled; on network/API failure it does not claim success. On success it records a change proposal, links `proposal:<id>` on the message, updates message state to `promoted → <id>`, and upserts the change into the secondary Changes list.

## Secondary surfaces

From the channel shell rail (defaults stay on **Channels** home):

| Surface | Purpose |
|---|---|
| Channels | Primary home: channel rail + message feed + composer |
| Issues | Familiar issue list derived from repository issues |
| Changes | Change proposal list; grows when messages are promoted |

These are secondary scanners for people who want GitHub-like lists without leaving the channel product metaphor.

## Interaction Model

- `support`, `ideas`, `bugs`, `agent-runs`, `previews`, and `governance` are repository-scoped channel views.
- The center of the app is always the message feed for the selected channel (unless Issues/Changes is opened).
- Unified comments use the same composer pattern whether the surface is support, review, preview feedback, agent-run discussion, or governance.
- Signed project actions stay collapsed until a message is selected.
- API-connected builds promote a selected message into a live change proposal through the Community API and surface durable proposal identity in the UI.
- Snapshot builds render clearly as read-only for live mutation when no API base URL is configured.

## Persona Scenarios

- Maintainers scan channels, select a high-signal community idea, and promote it into an intent without leaving the conversation; the linked proposal id is visible on the message and in Changes.
- GitHub-style open-source contributors add anchored comments from the same composer they use for support, preview feedback, and review notes; they can also open the Issues/Changes lists when they need a familiar scan.
- Security and compliance responders select a conversation and open a moderation/legal-hold trail from the same inline action surface.
- Agents appear as named participants with policy-bound work, visible signatures, and human review status.

## Competitive wedge (do not forget)

Epoch does **not** try to outcompete GitHub or Tangled as a general forge or AT social network. Community Web owns the wedge: *conversation → signed intent → agent-assisted work → human review*, with honest offline/snapshot behavior and private-capable modes. See [community-web-competitive-evaluation.md](community-web-competitive-evaluation.md).

## Evidence

The executable browser journey is covered by [`features/community_web_experience.feature`](../features/community_web_experience.feature).

Recorded evidence is stored in [`docs/evidence/community-web/`](evidence/community-web/):

- [`community_web.feature.json`](evidence/community-web/community_web.feature.json)
- [`community_web.webm`](evidence/community-web/community_web.webm)
