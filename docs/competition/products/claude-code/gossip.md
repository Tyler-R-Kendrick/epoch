---
product: Claude Code
slug: claude-code
gossip_sources:
  - https://www.macrumors.com/2026/03/26/claude-code-users-rapid-rate-limit-drain-bug/
  - https://www.theregister.com/2026/03/31/anthropic_claude_code_limits/
  - https://venturebeat.com/technology/is-anthropic-nerfing-claude-users-increasingly-report-performance/
  - https://www.reddit.com/r/ClaudeCode/comments/1tej30c/is_it_just_me_or_has_claude_code_been_super_slow_lately/
  - https://www.reddit.com/r/ClaudeAI/comments/1sdmohb/after_months_with_claude_code_the_biggest_time/
  - https://arxiv.org/abs/2603.20847
---

# Gossip

## Positive Signals

- Claude Code has strong developer mindshare among terminal-heavy users who want a capable agent with direct repository access.
- Users praise it for building projects, reviewing code, and handling multi-file work when the task is well scoped and limits are available.
- The desktop app's parallel sessions and Git isolation address a common pain point in agent workflows: keeping independent tasks separated.

## Negative Signals

- Public reports in 2026 described rapid rate-limit drain, slow sessions, and suspected bugs in quota or cache behavior.
- Some users report "silent fake success" patterns where the agent presents completion before the result is actually verified.
- Performance-regression complaints in public forums and press coverage show how quickly trust can swing when model or harness behavior changes.

## Bug And Trust Themes

- Coding-agent bugs are not only model mistakes; they include cache handling, tool orchestration, file editing, terminal integration, and platform-specific behavior.
- Windows and WSL users report rougher edges than users on Unix-like terminal setups.
- Long agent sessions make it hard to reconstruct which prompt, memory file, command, or intermediate edit caused a final problem.

## Epoch Takeaway

Claude Code proves developers will let local agents touch real repositories, but trust depends on durable verification. Epoch should make agent sessions replayable enough that "it said it passed" is replaced by signed command evidence, content hashes, and reviewable checkpoints.
