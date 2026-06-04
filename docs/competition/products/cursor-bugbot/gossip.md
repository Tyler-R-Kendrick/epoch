---
product: Cursor Bugbot
slug: cursor-bugbot
gossip_schema: 1
sources:
  - https://forum.cursor.com/t/bugbot-pricing-feedback/131907
  - https://forum.cursor.com/t/the-new-usage-based-bugbot-pricing-punishes-iterative-workflows-and-power-users/161134
  - https://forum.cursor.com/t/rate-card-for-bugbot-usage-based-pricing-and-effort-settings-not-visible/160347
  - https://www.reddit.com/r/cursor/comments/1tacu2m/bugbot_moving_to_usage_based/
  - https://www.reddit.com/r/cursor/comments/1qm2sz0/has_anyone_here_been_using_bugbot/
  - https://www.reddit.com/r/cursor/comments/1mp16ys/bugbot_should_resolve_its_own_outdated_comments/
---

# Cursor Bugbot Gossip

## Positive Signals

- Users like the idea of review comments that can be fixed directly in Cursor rather than copied into another assistant.
- Community comparisons often call out Bugbot's editor-linked repair path as a practical advantage.
- Cursor claims internal evidence that higher-effort Bugbot finds more bugs while preserving high resolution rates.

## Complaints And Friction

- Usage-based pricing triggered forum complaints from power users who want continuous review across many iterative PR updates.
- Some users report confusion about whether cost comes from a separate Bugbot pool, on-demand spend, API usage, or included plan usage.
- Teams complain that Bugbot may leave outdated comments unresolved or miss issues on a first pass.

## What Seems Buggy Or Risky

- If review runs are expensive, teams may delay Bugbot until the final PR state, weakening the continuous review promise.
- Outdated comments and incomplete passes can create cleanup work for maintainers.
- A review product tied tightly to the same editor that generated the code can raise independence concerns for high-trust workflows.

## Epoch Opportunity

Epoch can make review independence explicit: the repository should show which agent generated the change, which reviewer agent inspected it, which comments were superseded, and which human accepted the final state.
