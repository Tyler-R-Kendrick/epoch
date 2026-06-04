---
product: Cursor Bugbot
slug: cursor-bugbot
category: cursor_connected_ai_pull_request_reviewer
primary_sources:
  - https://docs.cursor.com/bugbot
  - https://cursor.com/blog/may-2026-bugbot-changes
  - https://cursor.com/pricing
  - https://forum.cursor.com/t/rate-card-for-bugbot-usage-based-pricing-and-effort-settings-not-visible/160347
  - https://forum.cursor.com/t/the-new-usage-based-bugbot-pricing-punishes-iterative-workflows-and-power-users/161134
---

# Cursor Bugbot

Cursor Bugbot is Cursor's AI code review product for pull requests. It reviews GitHub PR diffs, identifies bugs, security issues, and code quality problems, comments with explanations and fix suggestions, and links findings back into Cursor or Cursor web agents for repair.

## Competitive Relevance

- Bugbot extends Cursor beyond code generation into pull request validation.
- It runs automatically on PR updates or manually through comments such as `cursor review` or `bugbot run`.
- Fix in Cursor and Fix in Web make review findings actionable inside the same agent/editor environment that likely authored the code.
- Cursor's May 2026 pricing shift makes Bugbot usage-based with configurable effort levels instead of a fixed per-seat add-on for many users.

## Epoch Implications

- Cursor is connecting generation, review, and fix loops inside one proprietary workspace.
- Bugbot's effort controls show that review quality and cost are becoming product settings, not only model quality.
- Epoch can differentiate by storing review findings, effort level, fix lineage, and acceptance evidence in repository history rather than editor account state.

## Unknowns To Track

- Recheck the dashboard-visible rate card and effort controls because forum users report confusion during the 2026 pricing transition.
- Track whether Bugbot Autofix becomes a default part of Cursor's pull request workflow.
