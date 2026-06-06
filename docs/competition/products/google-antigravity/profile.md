---
product: Google Antigravity
category: agent_first_development_platform
last_researched: 2026-06-06
sources:
  - https://antigravity.google/docs/home?authuser=0
  - https://www.antigravity.google/blog/introducing-google-antigravity-2-0
  - https://www.antigravity.google/product/antigravity-cli
  - https://www.reddit.com/r/google_antigravity/comments/1sqkdn8/antigravity_is_barely_usable_even_as_a_paid_user/
  - https://www.techradar.com/ai-platforms-assistants/googles-antigravity-ai-deleted-a-developers-drive-and-then-apologized
---

# Google Antigravity

## Summary

Google Antigravity is an agent-first development platform that separates agent management from a conventional IDE while still giving agents access to editor, terminal, and browser tools. Its competitive pressure on Epoch is the explicit shift from developer-operated tools to managed autonomous agents that communicate through tasks and artifacts.

## Product Model

- Agent-first development platform with IDE and Agent Manager concepts.
- Antigravity 2.0 is described as a separate desktop application that keeps core Agent Manager principles while broadening orchestration.
- CLI surface for terminal-first interaction and concurrent background agent sessions.
- Agents operate across editor, terminal, and browser contexts and report work through higher-level tasks and artifacts.
- Pricing and usage are tied into Google AI subscription and consumption signals rather than a simple open-source tool model.

## Competitive Differentiation

Antigravity differentiates by extracting agents into their own management surface. The user is not only chatting with an assistant inside an editor; they are expected to supervise concurrent agents across workspaces and review artifacts produced by those agents.

## Epoch Implications

- Epoch should treat agent artifacts as first-class objects with signed provenance, review state, and rollback boundaries.
- Antigravity validates the need for multi-agent supervision, but public complaints show that autonomy must be bounded by clear permissions.
- Epoch can differentiate by making destructive tool access, worktree scope, quota burn, and evidence trails visible before an agent acts.
