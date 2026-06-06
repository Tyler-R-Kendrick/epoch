---
product: Google Antigravity
design_surface: agent_manager_ide_cli
last_researched: 2026-06-06
sources:
  - https://antigravity.google/docs/home?authuser=0
  - https://www.antigravity.google/blog/introducing-google-antigravity-2-0
  - https://www.antigravity.google/product/antigravity-cli
---

# Google Antigravity Design

## Look and Feel

Antigravity's public design language is agent-first and orchestration-oriented. The docs emphasize a higher-level Agent Manager surface rather than a normal editor sidebar. The product story combines familiar IDE affordances with an agent workspace where tasks, artifacts, browser operations, terminal work, and concurrent sessions become the user's primary objects.

## Design References

- Product docs: https://antigravity.google/docs/home?authuser=0
- Antigravity 2.0 announcement: https://www.antigravity.google/blog/introducing-google-antigravity-2-0
- Antigravity CLI page: https://www.antigravity.google/product/antigravity-cli

## Design Tokens and Visual System

Google does not publish Antigravity-specific open design tokens for external reuse. The observed system follows modern Google product patterns: clean surfaces, product screenshots, task/artifact framing, and a focus on agent orchestration rather than decorative marketing chrome.

## What Differentiates the Design

- The agent manager makes autonomous work the primary surface instead of hiding it inside chat.
- Tasks and artifacts are the core communication pattern, which can make large agent runs easier to review.
- The CLI complements the GUI with terminal-first delegation and concurrent background sessions.
- Browser primitives are presented as agent tools, not only as preview panes.

## What Is Good

- It acknowledges that agents need their own supervision surface.
- Concurrent task orchestration matches real developer workflows better than single-thread chat.
- Artifact-based communication gives users reviewable outputs rather than only conversational summaries.
- The CLI path keeps advanced users from being trapped in the GUI.

## Where It Breaks Down

- Users report that the agent-first shift can feel like losing direct IDE control.
- Hidden or background worktrees create anxiety when users cannot see exactly what changed.
- Pricing, quotas, and subscription mapping are not as legible as the task UI.
- Autonomous terminal and browser access raises severe safety expectations; a polished agent manager is not enough if destructive operations are under-confirmed.
