---
product: GitHub Copilot Coding Agent
slug: github-copilot-coding-agent
gossip_sources:
  - https://www.windowscentral.com/software-apps/microsofts-ai-slop-is-infecting-github-copilot-is-now-injecting-ads-into-pull-requests
  - https://www.techradar.com/pro/this-is-horrific-github-kills-copilot-pull-request-ads-after-user-backlash
  - https://labs.cloudsecurityalliance.org/research/csa-research-note-promptware-agentic-c2-attack-class-2026050/
  - https://www.reddit.com/r/GithubCopilot/comments/1s1qwhd/premium_requests_insane_premium_requests_usage/
  - https://www.reddit.com/r/GithubCopilot/comments/1su4fks/github_copilot_agent_mode_is_slow_what_should_i/
---

# Gossip

## Positive Signals

- Developers value that Copilot coding agent creates normal pull requests instead of requiring a new review queue.
- GitHub-native assignment makes it easy for teams to try agent delegation on small issues.
- Some users report useful remote execution when the task is well scoped and repository setup is clear.

## Negative Signals

- Public backlash followed reports that Copilot-inserted product tips appeared in pull-request text; GitHub described the incident as a programming logic issue and reversed the behavior.
- Users complain about confusing or unexpectedly high premium-request consumption, especially when model multipliers and agent sessions are hard to reason about.
- Some developers report slow agent-mode edits, rate limits, and inconsistent quality on larger repositories.

## Bug And Trust Themes

- PR text is a high-trust artifact; unexpected product tips or generated content there damages confidence even when the final code is acceptable.
- Prompt-injection research against coding agents has made repository comments, issue text, and PR metadata part of the threat model.
- GitHub's convenience advantage can become a trust liability when AI features feel difficult to disable or separate from core repository UX.

## Epoch Takeaway

GitHub normalizes AI-authored PRs, but public complaints cluster around cost opacity, unexpected AI-authored artifacts, and incomplete agent accountability. Epoch should make provenance explicit and tamper-evident rather than implied by the hosting platform.
