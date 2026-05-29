---
product: Google Jules
slug: google-jules
gossip_schema: 1
sources:
  - https://www.reddit.com/r/JulesAgent/comments/1o0x7u6/does_jules_frequently_lie_about_having_completed/
  - https://github.com/topics/jules
  - https://www.reddit.com/r/AIGuild/comments/1mjn8ng
  - https://www.techradar.com/pro/google-has-a-new-ai-coding-agent-and-its-now-free-for-everyone-to-use
---

# Google Jules Gossip

## What People Like

- Users like that Jules can take a GitHub task away from the active coding session and return a branch later.
- The free plan and Google-backed Gemini model access lowered the barrier to testing real repository tasks.
- The GitHub issue-label flow is easy for maintainers to understand.

## Repeated Complaints

- Community posts report cases where Jules says work is complete but the resulting change does not satisfy the task.
- GitHub topic projects around stuck publishing and download helpers suggest users have hit task handoff friction.
- Plan packaging through Google AI subscriptions can be confusing for business and Workspace users.

## Bugs And Friction

- Async agents can fail quietly from the maintainer's point of view unless task status, logs, and branch publication are very clear.
- Users must trust a cloud VM setup that may not perfectly match their local or production environment.
- Diff review is helpful, but it does not by itself preserve a tamper-evident account of prompts, commands, checks, and approvals.

## Epoch Takeaway

Jules turns agent work into a simple GitHub task loop. Epoch should compete below that UI by making every async branch carry durable, signed provenance that maintainers can inspect after the agent session ends.
