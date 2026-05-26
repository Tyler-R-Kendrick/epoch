---
product: Cursor
gossip_sources:
  - https://forum.cursor.com/
  - https://www.reddit.com/r/cursor/comments/1q9r8qr/cursor_ai_keeps_breaking_projects_right_when/
  - https://www.reddit.com/r/cursor/comments/1r4gekk/how_cursor_is_going_to_survive/
  - https://www.reddit.com/r/cursor/comments/1rm9s2n/cursor_goes_to_war_for_ai_coding_dominance/
  - https://www.axios.com/2026/04/21/cursor-chainguard-ai-code-security
---

# Gossip

## What People Say

Public discussion is strongly split between "Cursor is the best integrated AI coding UX" and "the agent still breaks projects, costs too much, or loses reliability under complex context." Fans often point to inline diffs, codebase awareness, and Composer/Agent depth. Skeptics compare it against Claude Code, Codex, opencode, and plain VS Code workflows.

## Bug And Friction Themes

- Users report context decay, regressions near the end of projects, and reliance on checkpoints or fresh chats to recover.
- Pricing and usage limits are a recurring complaint because model selection, background work, and long context can make spend feel indirect.
- Security commentary around AI-generated dependencies has become more prominent, including Cursor's public push to steer generated code toward safer open-source components.
- Forum and Reddit threads show normal fast-moving IDE friction: crashes, apply/review freezes, background-agent disconnects, and model behavior changes.

## Product Risk For Epoch

Cursor could make "checkpoint" the default user expectation for agent recovery even though its checkpoints are not durable, signed, portable, or complete repository history.

## Opportunity For Epoch

Epoch can provide the missing substrate: every agent edit can become a signed intent event with durable content addresses, reproducible materialization, and review/test evidence independent of Cursor.
