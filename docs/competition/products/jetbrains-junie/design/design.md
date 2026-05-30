---
product: JetBrains Junie
slug: jetbrains-junie
design_sources:
  - https://www.jetbrains.com/help/ai-assistant/junie-agent.html
  - https://junie.jetbrains.com/
  - https://www.jetbrains.com/help/ai-assistant/settings-tools-ai-assistant.html
---

# Design

## Look And Feel

Junie inherits the JetBrains IDE visual language: dense tool windows, file trees, side panels, inline changed-file lists, approval prompts, and settings-driven configuration. The public Junie site contrasts that mature IDE density with a sharper terminal-agent launch story: install command first, tabs for terminal/GitHub/GitLab, benchmark numbers, and short feature bands for plan mode, live prompting, remote control, custom guidelines, and skills.

## Open Design Artifacts

- JetBrains publishes workflow screenshots in the AI Assistant help docs for selecting Junie, approving operations, rolling back files, rolling back checkpoints, enabling Brave Mode, configuring MCP, and respecting `.aiignore`.
- The Junie landing page acts like a lightweight design spec for the CLI/web surface: dark terminal imagery, model/provider messaging, benchmark cards, and pricing tiers.
- There is no open standalone design-token package for Junie; the public design contract is the JetBrains IDE UI plus documented agent interactions.

## Differentiators

- IDE-native changed-file panes and rollback affordances make large agent edits feel closer to ordinary JetBrains refactoring workflows.
- Approval prompts and Brave Mode create an explicit control gradient from supervised execution to autonomous file and command changes.
- `AGENTS.md` support aligns with repo-native agent instructions instead of burying standards only in account settings.
- The CLI/web/GitHub/GitLab framing keeps Junie from being perceived as only another IDE side chat.

## What Works Well

- Junie benefits from JetBrains' existing project model, inspections, navigation, and refactoring trust.
- The documented rollback and checkpoint UX gives users a visible escape hatch when the agent takes a wrong turn.
- MCP settings, `.aiignore`, and project guidelines are concrete trust controls rather than only marketing claims.

## Where It Breaks Down

- The coexistence of AI Chat, Junie, Claude Agent, Codex ACP, plugins, quotas, and CLI surfaces can make the product model hard to understand.
- Brave Mode is powerful but makes the IDE boundary blur: the same trusted workspace can become an autonomous command runner.
- Public Windows/WSL caveats and platform-specific IDE behavior reduce the sense that Junie is equally reliable across all professional environments.
