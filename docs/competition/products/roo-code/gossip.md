---
product: Roo Code
last_researched: 2026-06-06
sources:
  - https://docs.roocode.com/
  - https://github.com/RooCodeInc/Roo-Code/issues/5180
  - https://www.reddit.com/r/RooCode/comments/1ni777l/how_roo_marketplace_obtained_and_loaded_mcp_and_modes/
  - https://www.reddit.com/r/RooCode/comments/1jw8kmf/overview_of_all_the_configs/
  - https://www.reddit.com/r/ChatGPTCoding/comments/1joi2n1/roo_code_3110_release_notes_project_level_mcp/
---

# Roo Code Gossip

## What People Praise

- Users like custom modes because they can create role-specific assistants for architecture, coding, review, debugging, or documentation.
- MCP support gives advanced users a path to connect external tools and project workflows.
- Checkpoints and approvals make autonomous editing feel more controllable.
- VS Code integration lets users keep their existing editor muscle memory.

## What People Criticize

- The configuration surface is fragmented across `.roo`, mode files, MCP settings, global settings, and marketplace installs.
- Community discussions ask for clearer overviews of how rules, modes, MCPs, and project structures relate.
- MCP behavior can be confusing when resources or prompts are visible to servers but not useful in the model conversation.
- Marketplace loading raises practical questions about where code comes from and how it runs inside the editor session.

## Bugs and Friction Signals

- A GitHub issue reported the mode selector disappearing after an update, creating errors around `.roomodes`.
- Reddit threads show users working around configuration complexity with templates and custom file structures.
- The official shutdown notice is the largest trust signal: cloud/router dependency can leave users migrating even when the extension workflow was useful.

## Competitive Read

Roo Code shows that agent extensibility matters, but extensibility without simple provenance and configuration maps becomes hard to trust. Epoch should treat custom roles, MCP-like tools, and checkpoints as first-class signed objects with clear scope, owner, and rollback evidence.
