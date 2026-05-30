# Community Web Experience

Community Web is a channel-first social workspace for Epoch projects. The first screen is not a dashboard or landing page: it opens directly into repository-scoped channels and a message feed.

The experience uses familiar community patterns without cloning Discord. Channels organize the conversation, messages feel lightweight, and Epoch-specific capabilities appear only in context: after a user selects a message, the inline action tray exposes signed anchors, signatures, linked artifacts, intent promotion, agent requests, docs-patch capture, accepted-answer capture, and moderation reporting.

## Interaction Model

- `support`, `ideas`, `bugs`, `agent-runs`, `previews`, and `governance` are repository-scoped channel views.
- The center of the app is always the message feed for the selected channel.
- Unified comments use the same composer pattern whether the surface is support, review, preview feedback, agent-run discussion, or governance.
- Signed project actions stay collapsed until a message is selected.
- API-connected builds can promote a selected message into a live change proposal through the Community API.
- Snapshot builds render clearly as read-only when no API base URL is configured.

## Persona Scenarios

- Maintainers scan channels, select a high-signal community idea, and promote it into an intent without leaving the conversation.
- GitHub-style open-source contributors add anchored comments from the same composer they use for support, preview feedback, and review notes.
- Security and compliance responders select a conversation and open a moderation/legal-hold trail from the same inline action surface.
- Agents appear as named participants with policy-bound work, visible signatures, and human review status.

## Evidence

The executable browser journey is covered by [`features/community_web_experience.feature`](../features/community_web_experience.feature).

Recorded evidence is stored in [`docs/evidence/community-web/`](evidence/community-web/):

- [`community_web.feature.json`](evidence/community-web/community_web.feature.json)
- [`community_web.webm`](evidence/community-web/community_web.webm)
