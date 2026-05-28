---
product: Claude Code
slug: claude-code
category: terminal_and_desktop_agentic_coding_tool
primary_sources:
  - https://code.claude.com/docs
  - https://code.claude.com/docs/en/desktop
  - https://code.claude.com/docs/en/terminal-config
  - https://docs.claude.com/s/claude-code-github-actions
  - https://support.claude.com/en/articles/14554922-claude-code-user-faq
---

# Claude Code

Claude Code is Anthropic's agentic coding tool for terminal, IDE, desktop, and GitHub Actions workflows. It reads repositories, edits files, runs commands, supports plan review and conversation history, and can be invoked in GitHub issues or pull requests through GitHub Actions.

## Competitive Relevance

- Claude Code is a strong competitor for developers who want the agent in their local repository rather than only in an editor or cloud forge.
- The desktop app adds parallel sessions, Git isolation, integrated terminal/editor panes, side chats, computer use, visual diff review, app previews, PR monitoring, and connectors.
- GitHub Actions support lets teams mention Claude in issues or PRs to implement features, fix bugs, and create pull requests.
- Terminal themes, status lines, memory files, and project instructions turn repo-local context into part of the coding interface.

## Epoch Implications

- Claude Code normalizes long-running local and remote agent sessions that can touch many files and run arbitrary commands.
- Its Git isolation and visual diff review overlap with Epoch's need to make agent-authored work inspectable before it becomes durable history.
- Epoch can differentiate by making local agent activity cryptographically durable and shareable across tools, not trapped in a specific agent transcript or terminal session.

## Unknowns To Track

- Anthropic's model defaults, rate limits, desktop feature split, and GitHub Action behavior change quickly.
- Enterprise security posture depends on Anthropic account controls, local machine policy, connector configuration, and whether teams run the agent locally, in desktop, or in CI.
