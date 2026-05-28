---
product: Claude Code
slug: claude-code
design_sources:
  - https://code.claude.com/docs
  - https://code.claude.com/docs/en/desktop
  - https://code.claude.com/docs/en/terminal-config
  - https://docs.claude.com/s/claude-code-github-actions
---

# Design

## Look And Feel

Claude Code began as a terminal-first coding interface and now spans CLI, IDE integration, desktop GUI, and GitHub Actions. The CLI design is text-heavy and keyboard-driven: prompts, tool calls, diffs, approvals, status lines, slash commands, and memory/config files. The desktop app adds pane-based visual workspaces with terminals, editors, previews, side chats, and PR monitoring.

## Open Design Artifacts

- Public docs describe terminal themes, custom status lines, VS Code behavior, desktop pane layout, visual diff review, app previews, and GitHub Action mention workflows.
- The UI design surface is less about brand tokens and more about operational affordances: isolate sessions, inspect diffs, approve tool use, and keep context visible.
- There is no broad open design system; the public design contract is documented workflow behavior.

## Differentiators

- Terminal-first design makes Claude Code feel native to engineers who live in shells and local repositories.
- Desktop parallel sessions with Git isolation are a strong differentiator for managing multiple agent tasks without mixing working trees.
- GitHub Actions mentions bridge local agent expectations into hosted review workflows.

## What Works Well

- File-based project instructions and memory fit existing repo conventions and make the agent steerable without repeated prompts.
- Visual diff review and app previews reduce the risk of accepting a large opaque patch.
- The CLI's low ceremony lets power users compose Claude Code with existing scripts, tests, and repository workflows.

## Where It Breaks Down

- Terminal output can become an incomplete audit trail when long sessions span many tools, approvals, retries, and edits.
- Local machine differences, shell behavior, WSL/Windows quirks, and terminal paste limitations can become part of the product experience.
- A powerful local agent can blur the boundary between reversible exploration and durable history unless teams use Git, worktrees, and review gates carefully.
