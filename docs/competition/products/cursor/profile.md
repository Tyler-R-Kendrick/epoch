---
product: Cursor
slug: cursor
category: ai_native_editor_agent_checkpoints_and_code_review
primary_sources:
  - https://www.cursor.com/
  - https://docs.cursor.com/
  - https://docs.cursor.com/agent
  - https://docs.cursor.com/en/agent/chat/checkpoints
  - https://docs.cursor.com/background-agents
  - https://docs.cursor.com/en/context
  - https://docs.cursor.com/en/bugbot
  - https://www.cursor.com/pricing
---

# Cursor

Cursor is an AI-native code editor built around codebase-aware chat, autonomous Agent mode, inline edit, rules, local checkpoints, background agents, and Bugbot pull-request review. It competes with Epoch around agent-authored code changes, rollback expectations, review evidence, and the question of where durable software history should live when AI edits become a normal development path.

## Competitive Relevance

- Agent mode can explore a repository, edit multiple files, run commands, and fix errors from inside the editor.
- Checkpoints automatically snapshot Agent-made changes, but Cursor explicitly positions them as separate from Git and not a version-control replacement.
- Background agents move AI edits into remote machines while preserving a handoff back to the editor.
- Rules, AGENTS.md support, Bugbot rules, and PR review connect editor-local guidance to repository policy.

## Epoch Implications

- Cursor proves that developers now expect conversational edits to produce recoverable states, not just diffs.
- Cursor's checkpoint limitation is an opening for Epoch: agent changes need signed, durable, shareable, content-addressed history rather than ephemeral local undo.
- Bugbot shows the review loop moving closer to automated change producers; Epoch should make provenance, policy, and review evidence part of the same history object.

## Unknowns To Track

- Pricing and usage packages are changing quickly as agent usage shifts from seat-based plans toward model-cost accounting.
- Background Agent retention and remote execution details are intentionally product-managed; durable audit guarantees should be rechecked before enterprise comparisons.
