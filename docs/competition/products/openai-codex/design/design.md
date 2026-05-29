---
product: OpenAI Codex
slug: openai-codex
design_schema: 1
sources:
  - https://openai.com/index/introducing-the-codex-app/
  - https://developers.openai.com/codex/explore/
  - https://openai.com/index/running-codex-safely/
---

# OpenAI Codex Design

## Look And Feel

Codex extends ChatGPT's restrained product language into a developer command center. The public screenshots and launch materials show dark and light app surfaces, thread-style task panes, compact diff review, project grouping, and a strong bias toward text-first supervision rather than decorative workspace chrome.

## Design References

- Product screenshots: Codex app launch post, desktop app task threads, diff review, skills management, and project surfaces.
- Open design cues: open-source CLI and sandbox documentation expose the underlying command and permission model even when the commercial app UI is closed.
- Design tokens: no public Codex token package is advertised; visual consistency appears inherited from ChatGPT/OpenAI product surfaces.

## Differentiators

- Multi-agent supervision is the main visual differentiator: separate threads, project grouping, and worktree-aware context make agent parallelism visible.
- Diff review lives in the same conversational task surface, reducing the mental jump between prompt, agent output, and code review.
- Permission prompts and sandbox language are productized as part of the interaction design instead of hidden as implementation details.

## What Works Well

- The app gives developers a clear place to monitor long-running work without living inside a terminal scrollback.
- Worktree isolation maps to a mental model developers already understand.
- The same configuration and history crossing CLI, app, IDE, and cloud helps Codex feel like one agent system rather than several disconnected clients.

## UX Breakdowns

- Token-credit usage is harder to reason about than a simple seat or task quota, especially for output-heavy agent sessions.
- Approval and sandbox prompts can become repetitive when a repo needs setup, network access, or package installation.
- Teams that need durable governance still have to bridge between Codex logs, GitHub review, local worktrees, and their own audit systems.
