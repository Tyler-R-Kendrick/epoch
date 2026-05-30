---
product: JetBrains Junie
slug: jetbrains-junie
category: ide_native_and_cli_coding_agent
primary_sources:
  - https://www.jetbrains.com/help/ai-assistant/junie-agent.html
  - https://junie.jetbrains.com/
  - https://blog.jetbrains.com/junie/2026/03/junie-cli-the-llm-agnostic-coding-agent-is-now-in-beta/
  - https://blog.jetbrains.com/blog/2025/04/16/jetbrains-ides-go-ai/
---

# JetBrains Junie

JetBrains Junie is an AI coding agent embedded in JetBrains IDEs and available through Junie CLI. It plans and executes multi-step repository work, edits files, runs terminal commands, connects to MCP tools, supports project guidelines through `AGENTS.md`, and can operate through terminal, GitHub, and GitLab workflows.

## Competitive Relevance

- Junie competes for developers who already trust IntelliJ IDEA, WebStorm, PyCharm, GoLand, and the broader JetBrains platform as their daily workbench.
- The product combines IDE-native project intelligence, terminal execution, checkpoints, rollback, approval controls, MCP access, and repo-stored agent instructions.
- The Junie CLI broadens the product from "AI inside JetBrains" to a cross-surface coding agent that can be monitored or invoked outside the IDE.
- JetBrains markets model flexibility, BYOK options, provider-rate pricing, and benchmark cost efficiency as a way to keep power users from migrating to Cursor, Claude Code, or Codex.

## Epoch Implications

- Junie makes agent work feel like an extension of mature IDE affordances: navigation, inspections, diffs, run configurations, and project metadata.
- Its checkpoint and rollback model overlaps with Epoch's durability story, but those checkpoints remain tied to the agent and IDE session rather than becoming portable signed history.
- Epoch can differentiate by preserving agent actions, approvals, file hashes, terminal evidence, and resulting commits independent of the IDE or model vendor.

## Unknowns To Track

- JetBrains AI credit accounting, model routing, and CLI/GitHub/GitLab coverage are moving quickly.
- Junie's WSL limitation, plugin split, and AI quota behavior may materially affect Windows and enterprise developer adoption.
