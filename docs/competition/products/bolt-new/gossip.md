---
product: Bolt.new
slug: bolt-new
gossip_sources:
  - https://www.reddit.com/r/boltnewbuilders/comments/1ssvanh/boltnew_github_integration_issues/
  - https://www.reddit.com/r/boltnewbuilders/comments/1h060ll/my_biggest_issue_with_boltnew/
  - https://www.reddit.com/r/boltnewbuilders/comments/1k700op/anyone_else_lost_a_project_on_boltnew_paid_200/
  - https://www.reddit.com/r/nocode/comments/1tgozdy/tested_6_ai_app_builders_for_client_work_over_2/
  - https://www.reddit.com/r/nocode/comments/1rw8r7s/i_burned_700_and_3_months_testing_11_ai_app/
---

# Gossip

## Positive Signals

- Users praise Bolt for fast first drafts, visible code, immediate previews, and the credibility of StackBlitz's WebContainer runtime.
- The open-source core and community forks make technical users more comfortable evaluating how the agent works.
- Community comparisons often describe Bolt as one of the fastest tools for getting a simple web app on screen.

## Negative Signals

- Reddit users complain about token burn, retry loops, and projects that become expensive or difficult once the app is more complex.
- GitHub integration and persistence complaints include changes not syncing, generated edits not sticking, and file state reverting after AI changes.
- Some builders report losing usable project state or needing to leave Bolt for Cursor, Claude Code, or a local repo when production hardening begins.

## Bug And Trust Themes

- File-state ambiguity is the main trust issue: users need to know whether the prompt result, editor file, preview, and GitHub commit all match.
- Token metering can punish debugging loops where the agent repeatedly attempts the same fix.
- Browser-based speed can hide missing tests, auth edge cases, deployment config, and durable rollback strategy.

## Epoch Takeaway

Bolt.new makes the browser workspace feel like the product's source of truth. Epoch should preserve prompt, runtime, file, terminal, sync, and deployment events so users can prove which generated state actually became the accepted app.
