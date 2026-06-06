---
product: Roo Code
design_surface: vscode_extension_cloud_docs_marketplace
last_researched: 2026-06-06
sources:
  - https://docs.roocode.com/
  - https://roocodeinc.github.io/Roo-Code/features/marketplace/
  - https://roocodeinc.github.io/Roo-Code/basic-usage/using-modes/
---

# Roo Code Design

## Look and Feel

Roo Code's design is IDE-native and configuration-heavy. The public docs frame it as an "AI Software Engineering Team" that can work interactively in VS Code or autonomously in the cloud. The extension experience is organized around modes, model/profile configuration, marketplace installation, approvals, checkpoints, todos, codebase indexing, and terminal or file tools.

## Design References

- Current docs and shutdown notice: https://docs.roocode.com/
- Marketplace docs: https://roocodeinc.github.io/Roo-Code/features/marketplace/
- Modes docs: https://roocodeinc.github.io/Roo-Code/basic-usage/using-modes/

## Design Tokens and Visual System

Roo Code does not publish a formal design-token system for external reuse. Its design system is mostly an extension pattern inside VS Code: top-menu icons, mode selectors, settings panes, marketplace lists, and configuration files such as `.roo/mcp.json`, `.roomodes`, `mcp_settings.json`, and `custom_modes.yaml`.

## What Differentiates the Design

- Modes turn the assistant into a configurable team of roles rather than one generic chat agent.
- Tool permissions and model assignments can vary by mode.
- The marketplace creates a visible discovery surface for MCPs and mode packs.
- Checkpoints make rollback a built-in part of agent supervision.

## What Is Good

- Advanced users can tune workflows to match real team practices.
- Project and global scopes make shared configuration possible.
- The marketplace lowers the friction of discovering MCPs and custom assistants.
- Checkpoints and approval controls reduce the risk of autonomous edits.

## Where It Breaks Down

- The number of configs, modes, scopes, and MCP concepts can overwhelm new users.
- Marketplace installation of tools and modes creates security and provenance questions that are not solved by discoverability alone.
- A VS Code extension UI inherits VS Code density and may struggle to make multi-step autonomous work feel transparent.
- The shutdown notice undercuts user trust in cloud-dependent workflows.
