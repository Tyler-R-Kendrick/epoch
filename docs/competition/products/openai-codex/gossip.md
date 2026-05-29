---
product: OpenAI Codex
slug: openai-codex
gossip_schema: 1
sources:
  - https://github.com/openai/codex/issues/23853
  - https://www.reddit.com/r/codex/comments/1pgyd7n/codex_code_review_is_burning_my_weekly_quota_on/
  - https://www.reddit.com/r/OpenAI/comments/1n2eocl/how_to_auto_approve_commands_in_codex/
  - https://www.reddit.com/r/codex/comments/1tiuffn/network_sandbox_restriction_in_the_codex_tool/
  - https://www.tomshardware.com/tech-industry/artificial-intelligence/openclaw-creator-burns-through-1-3-million-in-openai-api-tokens-in-a-single-month
---

# OpenAI Codex Gossip

## What People Like

- Developers praise Codex when it can run for a long time, edit a repo, test, and return a reviewable diff.
- The open-source CLI and visible GitHub issue tracker make the agent feel inspectable compared with closed hosted agents.
- Multi-surface access is attractive: users can start locally, review in GitHub, and use cloud tasks for heavier work.

## Repeated Complaints

- Approval prompts and sandbox restrictions can interrupt otherwise routine local development.
- Users report confusion about how to discover or coordinate cloud review tasks from the CLI versus web UI.
- Code review can consume quota on low-risk or docs-only pull requests if teams do not tune triggers.
- Token-credit pricing creates anxiety because a better or more verbose model can burn through allowances faster.

## Bugs And Friction

- Network restrictions, setup commands, and package installs are common friction points in sandboxed sessions.
- Community threads show users asking how to loosen approvals, which is a signal that safety controls need clearer presets and better workflow guidance.
- High-volume agent fleets expose a cost-governance problem: useful automation can become expensive before teams have good controls.

## Epoch Takeaway

Codex has momentum, but the public friction is governance-shaped: pricing explainability, review-task visibility, and durable evidence. Epoch should make agent output cheaper to trust by storing what happened as signed project history.
